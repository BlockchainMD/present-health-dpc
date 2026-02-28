import crypto from 'crypto';
import { prisma } from '../prisma';
import { fetchTopicSignals } from './sources';
import { generateBrief } from './brief';
import { generateDraft } from './draft';
import { qaDraft } from './qa';
import { classifyCluster, classifyClusters, slugify } from './taxonomy';
import { getClusterWeights } from './feedback';
import { Brief, EngineOptions, EngineResult, InternalLinkSuggestion, TopicSignal } from './types';
import { getSeoHealthSnapshot } from '../seo-health/service';
import { DEFAULT_DISCLAIMER } from './disclaimer';
import { lintMarkdown } from './lint';
import { getNextPublishSlots } from './publish-slots';
import { generateFeaturedImage } from './image';

const MAX_PER_RUN = 10;
const DEFAULT_MAX_AUTO_PUBLISH_PER_DAY = 20;
const DEFAULT_REFRESH_DAYS = 30;

export async function runContentEngine(options: EngineOptions = {}): Promise<EngineResult> {
    const requested = typeof options.count === 'number' ? options.count : 5;
    const count = Math.min(Math.max(requested, 1), MAX_PER_RUN);
    const sources = resolveSources(options.mode || 'BALANCED', options.sources || {});
    const maxAutoPublishPerDay = Number(process.env.CONTENT_ENGINE_MAX_AUTO_PUBLISH_PER_DAY || DEFAULT_MAX_AUTO_PUBLISH_PER_DAY);
    const refreshDays = Number(process.env.CONTENT_ENGINE_REFRESH_DAYS || DEFAULT_REFRESH_DAYS);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const warnings: string[] = [];
    let autoPublishEnabled = Boolean(options.autoPublish);
    let autoPublishRemaining = maxAutoPublishPerDay;

    try {
        const seoSnapshot = await getSeoHealthSnapshot({ refreshIfStale: autoPublishEnabled });
        if (seoSnapshot.stale) {
            warnings.push('SEO health snapshot is stale; results may be delayed.');
        }
        if (seoSnapshot.report.status === 'RED') {
            warnings.push('SEO health status is RED.');
            if (seoSnapshot.config.hardStopOnRed) {
                warnings.push('Publishing hard stop is active until SEO health recovers.');
                if (autoPublishEnabled) {
                    autoPublishEnabled = false;
                }
            } else if (seoSnapshot.config.stopPublishingOnRed && autoPublishEnabled) {
                autoPublishEnabled = false;
                warnings.push('Auto-publishing disabled due to RED SEO health status.');
            }
            if (seoSnapshot.config.pauseDraftsOnRed) {
                warnings.push('Draft generation paused due to RED SEO health status.');
                return { created: 0, published: 0, articles: [], warnings };
            }
        }
    } catch (error) {
        console.warn('SEO health check failed; proceeding without gating.', error);
        warnings.push('SEO health check failed; proceeding without gating.');
    }

    if (autoPublishEnabled) {
        const publishedToday = await prisma.article.count({
            where: {
                status: 'PUBLISHED',
                createdAt: { gte: todayStart }
            }
        });
        autoPublishRemaining = Math.max(0, maxAutoPublishPerDay - publishedToday);
    }

    let signals = await fetchTopicSignals({
        sources,
        limit: Math.max(count * 4, 30)
    });
    if (signals.length === 0) {
        signals = await fetchTopicSignals({
            sources: { curated: true },
            limit: Math.max(count * 4, 30)
        });
    }
    if (signals.length === 0) {
        return { created: 0, published: 0, articles: [] };
    }
    const clusterWeights = options.useFeedback ? await getClusterWeights() : {};
    const pool = rankSignals(signals, options.mode || 'BALANCED', clusterWeights);
    // Pre-allocate publish slots for the whole run so articles spread naturally.
    const publishSlots = autoPublishEnabled ? getNextPublishSlots(count) : [];
    let slotIndex = 0;

    const attemptGenerate = async (allowExisting: boolean) => {
        const created: EngineResult['articles'] = [];
        let published = 0;
        const clusterCounts: Record<string, number> = {};
        const MAX_PER_CLUSTER = 2;
        const DPC_KEYWORDS = ['direct primary care', 'hsa', 'fsa', 'telehealth vs', 'telehealth vs in-person'];
        const MAX_DPC_PER_RUN = 1;
        let dpcCount = 0;

        for (const signal of pool) {
            if (created.length >= count) break;
            const clusterInfo = classifyClusters(signal.title);
            const cluster = clusterInfo.primary;
            if ((clusterCounts[cluster] || 0) >= MAX_PER_CLUSTER) continue;
            const lowerTitle = signal.title.toLowerCase();
            const isDpcTopic = DPC_KEYWORDS.some(keyword => lowerTitle.includes(keyword));
            if (isDpcTopic && dpcCount >= MAX_DPC_PER_RUN) continue;

            let brief = await generateBrief(signal);
            const existing = await prisma.article.findFirst({
                where: {
                    OR: [
                        { slug: brief.slug || undefined },
                        { title: brief.title }
                    ]
                }
            });
            if (existing) {
                const ageDays = (Date.now() - existing.createdAt.getTime()) / (1000 * 60 * 60 * 24);
                if (!allowExisting && ageDays < refreshDays) continue;

                const refreshedTitle = `${brief.title}: ${brief.angle}`;
                const refreshedSlug = slugify(refreshedTitle);
                const slugConflict = await prisma.article.findFirst({ where: { slug: refreshedSlug } });
                if (!allowExisting && slugConflict) continue;

                brief = {
                    ...brief,
                    title: refreshedTitle,
                    slug: refreshedSlug,
                    metaTitle: refreshedTitle
                };
            }

            const reviewType = options.reviewType === 'EDITORIAL' ? 'EDITORIAL' : 'CLINICAL';
            const reviewLabel = options.reviewLabel
                || (reviewType === 'EDITORIAL' ? 'Present Health Editorial Team' : 'Present Health Clinical Team');

            const draft = await generateDraft(brief);
            const qa = qaDraft(brief, draft, { reviewLabel });
            const contentHash = hashContent(qa.content);
            const duplicate = await prisma.article.findFirst({ where: { contentHash } });
            if (duplicate && !allowExisting) continue;
            if (duplicate && allowExisting) {
                qa.content = `${qa.content}\n\n## Variant focus\nThis version emphasizes: ${brief.angle}.`;
            }

            let finalSlug = slugify(qa.title || brief.title);
            if (finalSlug) {
                const slugExists = await prisma.article.findFirst({ where: { slug: finalSlug } });
                if (slugExists) {
                    finalSlug = slugify(`${finalSlug}-${Date.now().toString(36).slice(-4)}`);
                }
            }
            if (!finalSlug) {
                finalSlug = slugify(`${brief.title}-${Date.now().toString(36).slice(-4)}`);
            }

            const lintIssues = lintMarkdown(qa.content);
            const shouldAutoPublish = autoPublishEnabled && brief.riskLevel === 'LOW' && autoPublishRemaining > 0 && lintIssues.length === 0;
            if (shouldAutoPublish) autoPublishRemaining -= 1;

            // Build contextual internal links and inject them into the content.
            const internalLinks = await buildInternalLinks(brief);
            const contentWithLinks = injectInternalLinks(qa.content, internalLinks);

            // Append a sources section when we have a real reference URL.
            const contentWithSources = appendSourcesSection(contentWithLinks, signal);

            // Stagger the publish time to spread articles across the day.
            // Articles with a future publishedAt are visible on the site only
            // after that time — the pages already guard for this.
            let scheduledPublishAt: Date | null = null;
            if (shouldAutoPublish && publishSlots[slotIndex]) {
                scheduledPublishAt = publishSlots[slotIndex];
                slotIndex++;
            } else if (shouldAutoPublish) {
                // Fallback: if we ran out of pre-calculated slots, assign one now.
                const lastSlot = publishSlots[publishSlots.length - 1] ?? new Date();
                scheduledPublishAt = new Date(lastSlot.getTime() + 4 * 60 * 60 * 1000);
                publishSlots.push(scheduledPublishAt);
                slotIndex++;
            }

            // Generate a featured image (async, non-blocking on failure).
            let featuredImage: string | null = null;
            if (shouldAutoPublish) {
                try {
                    featuredImage = await generateFeaturedImage({
                        title: qa.title || brief.title,
                        cluster: brief.cluster,
                        riskLevel: brief.riskLevel,
                    });
                } catch {
                    // Image generation is best-effort; don't fail the article.
                }
            }

            const article = await prisma.article.create({
                data: {
                    title: qa.title || brief.title,
                    slug: finalSlug,
                    content: contentWithSources,
                    excerpt: qa.excerpt,
                    metaTitle: qa.metaTitle,
                    metaDescription: qa.metaDescription,
                    status: shouldAutoPublish ? 'PUBLISHED' : 'DRAFT',
                    publishedAt: scheduledPublishAt,
                    featuredImage: featuredImage || null,
                    sourceUrl: signal.url,
                    angle: brief.angle,
                    intent: brief.intent,
                    cluster: brief.cluster,
                    riskLevel: brief.riskLevel,
                    briefJson: {
                        ...brief,
                        internalLinks,
                        disclaimer: DEFAULT_DISCLAIMER,
                        qaFlags: qa.qaFlags || []
                    } as any,
                    evidenceJson: {
                        sources: [
                            { title: signal.title, url: signal.url, source: signal.source, kind: signal.kind }
                        ]
                    } as any,
                    contentHash: hashContent(contentWithSources),
                    reviewedByDisplayName: reviewLabel,
                    reviewType,
                    reviewedAt: shouldAutoPublish ? new Date() : null
                }
            });

            created.push({ id: article.id, title: article.title, slug: article.slug });
            clusterCounts[cluster] = (clusterCounts[cluster] || 0) + 1;
            if (isDpcTopic) dpcCount += 1;
            if (shouldAutoPublish) published += 1;
        }

        return { created, published };
    };

    let result = await attemptGenerate(false);
    if (result.created.length === 0) {
        result = await attemptGenerate(true);
    }

    return { created: result.created.length, published: result.published, articles: result.created, warnings };
}

// ---------------------------------------------------------------------------
// Internal link injection
// ---------------------------------------------------------------------------

const LINK_STOPWORDS = new Set([
    'that', 'this', 'with', 'from', 'have', 'more', 'when', 'what', 'your',
    'does', 'they', 'will', 'been', 'some', 'into', 'than', 'like', 'just',
    'over', 'also', 'most', 'very', 'much', 'even', 'back', 'good', 'well',
    'high', 'help', 'make', 'know', 'take', 'time', 'long', 'down', 'ways',
    'best', 'many', 'their', 'about', 'after', 'where', 'these', 'could',
    'other', 'which', 'would', 'there', 'should', 'cause', 'often', 'here',
]);

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Injects contextual markdown hyperlinks into the article content.
 *
 * Strategy:
 *   - Extract 2–3 meaningful words from each related article's title.
 *   - Find the first occurrence of that phrase in a paragraph line.
 *   - Replace it with a markdown link if it isn't already inside a link.
 *   - Skip heading lines and lines that already contain the target URL.
 *   - Stop after MAX_LINKS injections to avoid over-linking.
 */
function injectInternalLinks(content: string, links: InternalLinkSuggestion[]): string {
    const MAX_LINKS = 4;
    let result = content;
    let injected = 0;

    const articleLinks = links.filter(l => l.type !== 'conversion');

    for (const link of articleLinks) {
        if (injected >= MAX_LINKS) break;

        // Build candidate phrases from the link label (article title).
        const words = link.label
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3 && !LINK_STOPWORDS.has(w));

        if (words.length < 2) continue;

        let matched = false;

        // Try longest phrase first, then shorter fallbacks.
        for (let len = Math.min(3, words.length); len >= 2 && !matched; len--) {
            for (let start = 0; start <= words.length - len && !matched; start++) {
                const phrase = words.slice(start, start + len).join(' ');
                if (!phrase || phrase.length < 8) continue;

                const escaped = escapeRegex(phrase);
                // Don't match text already inside a markdown link `[…](…)`.
                // The negative lookbehind `(?<!\[)` and lookahead `(?!\])` handle
                // most common cases without full markdown AST parsing.
                const regex = new RegExp(`(?<!\\[|\\()\\b(${escaped})\\b(?!\\]|\\()`, 'i');

                const lines = result.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    // Skip heading lines and lines that already contain this URL.
                    if (/^#+\s/.test(line)) continue;
                    if (line.includes(`](${link.url})`)) continue;

                    if (regex.test(line)) {
                        lines[i] = line.replace(regex, `[$1](${link.url})`);
                        matched = true;
                        injected++;
                        break;
                    }
                }

                if (matched) {
                    result = lines.join('\n');
                }
            }
        }
    }

    return result;
}

// ---------------------------------------------------------------------------
// Sources / references section appended after QA
// ---------------------------------------------------------------------------

/**
 * Appends a concise "Sources & references" section to the article content
 * when the originating signal has a real URL.  This adds E-E-A-T signals
 * (cited sources) without cluttering the main article structure.
 */
function appendSourcesSection(content: string, signal: TopicSignal): string {
    if (!signal.url || !signal.url.startsWith('http')) return content;

    const kindLabel: Record<string, string> = {
        research: 'Research study',
        trial: 'Clinical trial',
        news: 'News report',
        guideline: 'Clinical guideline',
        trend: 'Trending topic',
        curated: '',
    };

    const label = kindLabel[signal.kind] || 'Reference';
    if (!label) return content; // Skip curated (no external URL to cite)

    const sourceName = signal.source.replace(/\s*\([^)]*\)\s*/g, '').trim();

    return (
        content.trimEnd() +
        `\n\n## Sources & references\n\n` +
        `- [${signal.title || sourceName}](${signal.url}) — *${sourceName}* (${label})\n`
    );
}

async function buildInternalLinks(brief: Brief): Promise<InternalLinkSuggestion[]> {
    const links: InternalLinkSuggestion[] = [
        { label: 'Join / See Pricing', url: '/pricing', type: 'conversion' }
    ];

    const primaryArticles = await prisma.article.findMany({
        where: {
            status: 'PUBLISHED',
            cluster: brief.cluster
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { slug: true, title: true }
    });

    for (const article of primaryArticles) {
        if (!article.slug) continue;
        links.push({ label: article.title, url: `/blog/${article.slug}`, type: 'cluster' });
    }

    const secondaryClusters = (brief.secondaryClusters || []).filter(Boolean).slice(0, 2);
    for (const cluster of secondaryClusters) {
        const secondaryArticle = await prisma.article.findFirst({
            where: {
                status: 'PUBLISHED',
                cluster
            },
            orderBy: { createdAt: 'desc' },
            select: { slug: true, title: true }
        });
        if (secondaryArticle?.slug) {
            links.push({ label: secondaryArticle.title, url: `/blog/${secondaryArticle.slug}`, type: 'cross-cluster' });
        }
    }

    const unique = new Map<string, InternalLinkSuggestion>();
    for (const link of links) {
        unique.set(link.url, link);
    }
    return Array.from(unique.values()).slice(0, 6);
}

function resolveSources(mode: EngineOptions['mode'], sources: EngineOptions['sources']) {
    if (mode === 'TREND') {
        return { ...sources, pubmed: false, trials: false, nih: false, curated: false };
    }
    if (mode === 'RESEARCH') {
        return { ...sources, trends: false, news: false, curated: false };
    }
    return sources;
}

function rankSignals(signals: TopicSignal[], mode: EngineOptions['mode'], weights: Record<string, number>) {
    const scored = signals.map(signal => {
        const cluster = classifyCluster(signal.title);
        const weight = weights[cluster] || 1;
        const recency = signal.publishedAt ? recencyScore(signal.publishedAt) : 0.1;
        const kindScore = signal.kind === 'trend' || signal.kind === 'news' ? 0.3 : signal.kind === 'research' ? 0.2 : 0.1;
        const base = mode === 'TREND'
            ? kindScore + recency
            : mode === 'RESEARCH'
                ? (signal.kind === 'research' ? 0.4 : 0.1) + recency
                : 0.2 + recency;
        const score = base * weight;
        return { signal, score, recency };
    });

    return scored
        .sort((a, b) => (b.score !== a.score ? b.score - a.score : b.recency - a.recency))
        .map(item => item.signal);
}

function recencyScore(publishedAt: string) {
    const published = new Date(publishedAt).getTime();
    if (!published) return 0.1;
    const ageHours = (Date.now() - published) / (1000 * 60 * 60);
    if (ageHours <= 24) return 0.5;
    if (ageHours <= 72) return 0.35;
    if (ageHours <= 168) return 0.2;
    return 0.1;
}

function hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
}

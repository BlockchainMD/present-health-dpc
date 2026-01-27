import crypto from 'crypto';
import { prisma } from '../prisma';
import { fetchTopicSignals } from './sources';
import { generateBrief } from './brief';
import { generateDraft } from './draft';
import { qaDraft } from './qa';
import { classifyCluster, slugify } from './taxonomy';
import { getClusterWeights } from './feedback';
import { EngineOptions, EngineResult } from './types';

const MAX_PER_RUN = 10;
const DEFAULT_MAX_AUTO_PUBLISH_PER_DAY = 20;

export async function runContentEngine(options: EngineOptions = {}): Promise<EngineResult> {
    const requested = typeof options.count === 'number' ? options.count : 5;
    const count = Math.min(Math.max(requested, 1), MAX_PER_RUN);
    const sources = resolveSources(options.mode || 'BALANCED', options.sources || {});
    const maxAutoPublishPerDay = Number(process.env.CONTENT_ENGINE_MAX_AUTO_PUBLISH_PER_DAY || DEFAULT_MAX_AUTO_PUBLISH_PER_DAY);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    let autoPublishRemaining = maxAutoPublishPerDay;

    if (options.autoPublish) {
        const publishedToday = await prisma.article.count({
            where: {
                status: 'PUBLISHED',
                createdAt: { gte: todayStart }
            }
        });
        autoPublishRemaining = Math.max(0, maxAutoPublishPerDay - publishedToday);
    }

    const signals = await fetchTopicSignals({
        sources,
        limit: Math.max(count * 4, 30)
    });
    if (signals.length === 0) {
        return { created: 0, published: 0, articles: [] };
    }
    const clusterWeights = options.useFeedback ? await getClusterWeights() : {};
    const pool = rankSignals(signals, options.mode || 'BALANCED', clusterWeights);
    const created: EngineResult['articles'] = [];
    let published = 0;
    const clusterCounts: Record<string, number> = {};
    const MAX_PER_CLUSTER = 2;
    const DPC_KEYWORDS = ['direct primary care', 'hsa', 'fsa', 'telehealth vs', 'telehealth vs in-person'];
    const MAX_DPC_PER_RUN = 1;
    let dpcCount = 0;

    for (const signal of pool) {
        if (created.length >= count) break;
        const cluster = classifyCluster(signal.title);
        if ((clusterCounts[cluster] || 0) >= MAX_PER_CLUSTER) continue;
        const lowerTitle = signal.title.toLowerCase();
        const isDpcTopic = DPC_KEYWORDS.some(keyword => lowerTitle.includes(keyword));
        if (isDpcTopic && dpcCount >= MAX_DPC_PER_RUN) continue;

        const brief = await generateBrief(signal);
        const existing = await prisma.article.findFirst({
            where: {
                OR: [
                    { slug: brief.slug || undefined },
                    { title: brief.title }
                ]
            }
        });
        if (existing) continue;

        const draft = await generateDraft(brief);
        const qa = qaDraft(brief, draft);
        const contentHash = hashContent(qa.content);
        const duplicate = await prisma.article.findFirst({ where: { contentHash } });
        if (duplicate) continue;
        const finalSlug = slugify(qa.title || brief.title);

        const reviewLabel = options.reviewLabel
            || (options.reviewType === 'EDITORIAL' ? 'Present Health Editorial Team' : 'Present Health Clinical Team');

        const autoPublish = options.autoPublish && brief.riskLevel === 'LOW' && autoPublishRemaining > 0;
        if (autoPublish) autoPublishRemaining -= 1;

        const article = await prisma.article.create({
            data: {
                title: qa.title || brief.title,
                slug: finalSlug,
                content: qa.content,
                excerpt: qa.excerpt,
                metaTitle: qa.metaTitle,
                metaDescription: qa.metaDescription,
                status: autoPublish ? 'PUBLISHED' : 'DRAFT',
                sourceUrl: signal.url,
                angle: brief.angle,
                intent: brief.intent,
                cluster: brief.cluster,
                riskLevel: brief.riskLevel,
                briefJson: brief as any,
                evidenceJson: {
                    sources: [
                        { title: signal.title, url: signal.url, source: signal.source, kind: signal.kind }
                    ]
                } as any,
                contentHash,
                reviewedByDisplayName: reviewLabel,
                reviewType: options.reviewType || 'CLINICAL',
                reviewedAt: autoPublish ? new Date() : null
            }
        });

        created.push({ id: article.id, title: article.title });
        clusterCounts[cluster] = (clusterCounts[cluster] || 0) + 1;
        if (isDpcTopic) dpcCount += 1;
        if (autoPublish) published += 1;
    }

    return { created: created.length, published, articles: created };
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

function rankSignals(signals: Array<{ title: string; publishedAt?: string; kind?: string }>, mode: EngineOptions['mode'], weights: Record<string, number>) {
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

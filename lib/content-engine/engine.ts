import crypto from 'crypto';
import { prisma } from '../prisma';
import { fetchTopicSignals } from './sources';
import { generateBrief } from './brief';
import { generateDraft } from './draft';
import { qaDraft } from './qa';
import { classifyCluster, slugify } from './taxonomy';
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
    const pool = (options.mode === 'TREND' || options.mode === 'RESEARCH')
        ? sortByRecency(signals)
        : shuffle(signals);
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

function shuffle<T>(items: T[]): T[] {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function sortByRecency(signals: Array<{ publishedAt?: string }>): Array<{ publishedAt?: string }> {
    return [...signals].sort((a, b) => {
        const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return bTime - aTime;
    });
}

function hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
}

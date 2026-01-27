import { prisma } from '../prisma';

const STRATEGY_KEY_CLUSTER = 'clusterWeights';
const STRATEGY_KEY_ANGLE = 'angleWeights';
const STRATEGY_KEY_INTENT = 'intentWeights';

export async function refreshStrategy(windowDays = 30) {
    const since = new Date();
    since.setDate(since.getDate() - windowDays);

    const metrics = await prisma.articleMetric.findMany({
        where: { date: { gte: since } },
        include: { article: true }
    });

    const totals = {
        cluster: new Map<string, { clicks: number; impressions: number }>(),
        angle: new Map<string, { clicks: number; impressions: number }>(),
        intent: new Map<string, { clicks: number; impressions: number }>()
    };

    let totalClicks = 0;
    let totalImpressions = 0;

    for (const metric of metrics) {
        const impressions = metric.impressions || 0;
        const clicks = metric.clicks || 0;
        totalClicks += clicks;
        totalImpressions += impressions;

        const cluster = metric.article.cluster || 'general';
        const angle = metric.article.angle || 'general';
        const intent = metric.article.intent || 'general';

        accumulate(totals.cluster, cluster, clicks, impressions);
        accumulate(totals.angle, angle, clicks, impressions);
        accumulate(totals.intent, intent, clicks, impressions);
    }

    const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0.02;

    const clusterWeights = calculateWeights(totals.cluster, avgCtr);
    const angleWeights = calculateWeights(totals.angle, avgCtr);
    const intentWeights = calculateWeights(totals.intent, avgCtr);

    await upsertStrategy(STRATEGY_KEY_CLUSTER, clusterWeights);
    await upsertStrategy(STRATEGY_KEY_ANGLE, angleWeights);
    await upsertStrategy(STRATEGY_KEY_INTENT, intentWeights);

    return { clusterWeights, angleWeights, intentWeights };
}

export async function getClusterWeights(): Promise<Record<string, number>> {
    const strategy = await prisma.contentStrategy.findUnique({
        where: { key: STRATEGY_KEY_CLUSTER }
    });
    return (strategy?.value as Record<string, number>) || {};
}

async function upsertStrategy(key: string, value: Record<string, number>) {
    await prisma.contentStrategy.upsert({
        where: { key },
        update: { value },
        create: { key, value }
    });
}

function accumulate(map: Map<string, { clicks: number; impressions: number }>, key: string, clicks: number, impressions: number) {
    const entry = map.get(key) || { clicks: 0, impressions: 0 };
    entry.clicks += clicks;
    entry.impressions += impressions;
    map.set(key, entry);
}

function calculateWeights(map: Map<string, { clicks: number; impressions: number }>, avgCtr: number) {
    const weights: Record<string, number> = {};
    const baseline = avgCtr || 0.02;

    for (const [key, value] of map.entries()) {
        if (value.impressions === 0) continue;
        const ctr = value.clicks / value.impressions;
        const ratio = ctr / baseline;
        const weight = Math.min(2.0, Math.max(0.5, ratio));
        weights[key] = Number(weight.toFixed(2));
    }

    return weights;
}

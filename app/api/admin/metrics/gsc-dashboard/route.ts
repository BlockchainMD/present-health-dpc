import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        const authorized = await verifyMetricsAuth(request);
        if (!authorized) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const daysParam = Number(request.nextUrl.searchParams.get('days') || 30);
        const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 90) : 30;

        const now = new Date();
        const currentStart = new Date(now);
        currentStart.setDate(currentStart.getDate() - days);

        const previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - days);

        // Fetch current + previous period in one query
        const metrics = await prisma.articleMetric.findMany({
            where: {
                source: 'GSC',
                date: { gte: previousStart },
            },
            select: {
                date: true,
                impressions: true,
                clicks: true,
                ctr: true,
                position: true,
                article: { select: { id: true, slug: true, title: true, cluster: true } },
            },
        });

        const gscConfigured = !!(process.env.GSC_SITE_URL && process.env.GSC_SERVICE_ACCOUNT_JSON);

        // Split into current and previous periods
        let currImpressions = 0, currClicks = 0, currWeightedPos = 0;
        let prevImpressions = 0, prevClicks = 0, prevWeightedPos = 0;

        const dailyMap = new Map<string, { date: string; impressions: number; clicks: number; positionSum: number; impressionCount: number }>();
        const articleMap = new Map<string, { slug: string; title: string; cluster: string; impressions: number; clicks: number; positionSum: number }>();
        const clusterMap = new Map<string, { cluster: string; impressions: number; clicks: number }>();

        for (const row of metrics) {
            const imp = row.impressions || 0;
            const clk = row.clicks || 0;
            const pos = row.position || 0;
            const isCurrent = row.date >= currentStart;

            if (isCurrent) {
                currImpressions += imp;
                currClicks += clk;
                currWeightedPos += pos * (imp || 1);

                // Daily time series
                const dateKey = row.date.toISOString().split('T')[0];
                const day = dailyMap.get(dateKey) || { date: dateKey, impressions: 0, clicks: 0, positionSum: 0, impressionCount: 0 };
                day.impressions += imp;
                day.clicks += clk;
                day.positionSum += pos * (imp || 1);
                day.impressionCount += imp || 1;
                dailyMap.set(dateKey, day);

                // Per-article aggregation
                const slug = row.article?.slug || 'unknown';
                const art = articleMap.get(slug) || {
                    slug,
                    title: row.article?.title || slug,
                    cluster: row.article?.cluster || 'unknown',
                    impressions: 0,
                    clicks: 0,
                    positionSum: 0,
                };
                art.impressions += imp;
                art.clicks += clk;
                art.positionSum += pos * (imp || 1);
                articleMap.set(slug, art);

                // Cluster aggregation
                const cluster = row.article?.cluster || 'Other';
                const cl = clusterMap.get(cluster) || { cluster, impressions: 0, clicks: 0 };
                cl.impressions += imp;
                cl.clicks += clk;
                clusterMap.set(cluster, cl);
            } else {
                prevImpressions += imp;
                prevClicks += clk;
                prevWeightedPos += pos * (imp || 1);
            }
        }

        const currCtr = currImpressions > 0 ? currClicks / currImpressions : 0;
        const currAvgPos = currImpressions > 0 ? currWeightedPos / currImpressions : 0;
        const prevCtr = prevImpressions > 0 ? prevClicks / prevImpressions : 0;
        const prevAvgPos = prevImpressions > 0 ? prevWeightedPos / prevImpressions : 0;

        const delta = (curr: number, prev: number) => prev > 0 ? (curr - prev) / prev : curr > 0 ? 1 : 0;

        const totals = {
            impressions: currImpressions,
            clicks: currClicks,
            ctr: currCtr,
            avgPosition: currAvgPos,
            deltas: {
                impressions: delta(currImpressions, prevImpressions),
                clicks: delta(currClicks, prevClicks),
                ctr: delta(currCtr, prevCtr),
                avgPosition: prevAvgPos > 0 ? (prevAvgPos - currAvgPos) / prevAvgPos : 0, // lower is better
            },
        };

        const timeSeries = Array.from(dailyMap.values())
            .map((d) => ({
                date: d.date,
                impressions: d.impressions,
                clicks: d.clicks,
                avgPosition: d.impressionCount > 0 ? d.positionSum / d.impressionCount : 0,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const topArticles = Array.from(articleMap.values())
            .map((a) => ({
                slug: a.slug,
                title: a.title,
                cluster: a.cluster,
                impressions: a.impressions,
                clicks: a.clicks,
                ctr: a.impressions > 0 ? a.clicks / a.impressions : 0,
                position: a.impressions > 0 ? a.positionSum / a.impressions : 0,
            }))
            .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
            .slice(0, 20);

        const clusters = Array.from(clusterMap.values())
            .map((c) => ({
                cluster: c.cluster,
                impressions: c.impressions,
                clicks: c.clicks,
                ctr: c.impressions > 0 ? c.clicks / c.impressions : 0,
            }))
            .sort((a, b) => b.clicks - a.clicks);

        const lastSync = await prisma.auditLog.findFirst({
            where: { action: 'GSC_SYNC' },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
        });

        return NextResponse.json({
            success: true,
            gscConfigured,
            days,
            totals,
            timeSeries,
            topArticles,
            clusters,
            lastSyncAt: lastSync?.createdAt || null,
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: String(error?.message || error) }, { status: 500 });
    }
}

async function verifyMetricsAuth(request: NextRequest) {
    const secret = process.env.CONTENT_ENGINE_METRICS_SECRET || process.env.CONTENT_ENGINE_CRON_SECRET;
    if (secret) {
        const header = request.headers.get('x-metrics-secret');
        const bearer = request.headers.get('authorization')?.replace('Bearer ', '');
        if (header === secret || bearer === secret) return true;
    }
    try {
        await requireAdmin();
        return true;
    } catch {
        return false;
    }
}

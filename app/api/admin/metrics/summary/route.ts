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

        const daysParam = Number(request.nextUrl.searchParams.get('days') || 7);
        const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 90) : 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const metrics = await prisma.articleMetric.findMany({
            where: {
                source: 'GSC',
                date: { gte: startDate }
            },
            select: {
                impressions: true,
                clicks: true,
                ctr: true,
                position: true,
                article: { select: { slug: true, title: true } }
            }
        });

        let totalImpressions = 0;
        let totalClicks = 0;
        let weightedPositionSum = 0;

        const bySlug = new Map<string, { slug: string; title: string; impressions: number; clicks: number; positionSum: number }>();

        for (const row of metrics) {
            const impressions = row.impressions || 0;
            const clicks = row.clicks || 0;
            totalImpressions += impressions;
            totalClicks += clicks;
            weightedPositionSum += (row.position || 0) * (impressions || 1);

            const slug = row.article?.slug || 'unknown';
            const title = row.article?.title || slug;
            const current = bySlug.get(slug) || { slug, title, impressions: 0, clicks: 0, positionSum: 0 };
            current.impressions += impressions;
            current.clicks += clicks;
            current.positionSum += (row.position || 0) * (impressions || 1);
            bySlug.set(slug, current);
        }

        const avgPosition = totalImpressions > 0 ? weightedPositionSum / totalImpressions : 0;
        const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

        const topArticles = Array.from(bySlug.values())
            .map((item) => ({
                slug: item.slug,
                title: item.title,
                impressions: item.impressions,
                clicks: item.clicks,
                ctr: item.impressions > 0 ? item.clicks / item.impressions : 0,
                position: item.impressions > 0 ? item.positionSum / item.impressions : 0
            }))
            .sort((a, b) => (b.clicks - a.clicks) || (b.impressions - a.impressions))
            .slice(0, 20);

        const lastSync = await prisma.auditLog.findFirst({
            where: { action: 'GSC_SYNC' },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true, metadata: true }
        });

        return NextResponse.json({
            success: true,
            days,
            startDate: startDate.toISOString(),
            totals: {
                impressions: totalImpressions,
                clicks: totalClicks,
                ctr,
                avgPosition
            },
            topArticles,
            lastSyncAt: lastSync?.createdAt || null,
            lastSyncMeta: lastSync?.metadata || null
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

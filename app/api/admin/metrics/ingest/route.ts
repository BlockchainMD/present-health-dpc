import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { refreshStrategy } from '@/lib/content-engine/feedback';
import { requireAdmin } from '@/lib/authz';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const authorized = await verifyMetricsAuth(request);
        if (!authorized) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
        }
        const source = typeof body.source === 'string' && body.source.trim()
            ? body.source.trim().slice(0, 32)
            : 'GSC';
        const metrics = Array.isArray(body.metrics) ? body.metrics : [];
        if (metrics.length > 5000) {
            return NextResponse.json({ success: false, error: 'Payload too large' }, { status: 413 });
        }
        const refresh = Boolean(body.refreshStrategy);

        let upserted = 0;

        for (const item of metrics) {
            if (!item || typeof item !== 'object') continue;
            const date = item.date ? new Date(item.date) : new Date();
            if (Number.isNaN(date.getTime())) continue;
            const impressions = toNumber(item.impressions);
            const clicks = toNumber(item.clicks);
            const ctr = item.ctr !== undefined ? toNumber(item.ctr) : (impressions > 0 ? clicks / impressions : 0);
            const position = toNumber(item.position);

            let articleId = item.articleId;
            if (!articleId && item.slug) {
                const article = await prisma.article.findFirst({ where: { slug: item.slug } });
                articleId = article?.id;
            }
            if (!articleId && item.id) {
                articleId = item.id;
            }
            if (!articleId) continue;

            await prisma.articleMetric.upsert({
                where: {
                    articleId_date_source: {
                        articleId,
                        date,
                        source
                    }
                },
                update: {
                    impressions,
                    clicks,
                    ctr,
                    position
                },
                create: {
                    articleId,
                    date,
                    source,
                    impressions,
                    clicks,
                    ctr,
                    position
                }
            });

            upserted += 1;
        }

        let strategy = null;
        if (refresh) {
            strategy = await refreshStrategy();
        }

        await prisma.auditLog.create({
            data: {
                actorUserId: null,
                action: 'INGEST_ARTICLE_METRICS',
                entityType: 'ArticleMetric',
                entityId: source,
                metadata: { upserted, source }
            }
        });

        return NextResponse.json({ success: true, upserted, strategy });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to ingest metrics' }, { status: 500 });
    }
}

function toNumber(value: any, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

async function verifyMetricsAuth(request: Request) {
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

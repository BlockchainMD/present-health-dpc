import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { refreshStrategy } from '@/lib/content-engine/feedback';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const source = body.source || 'GSC';
        const metrics = Array.isArray(body.metrics) ? body.metrics : [];
        const refresh = Boolean(body.refreshStrategy);

        let upserted = 0;

        for (const item of metrics) {
            const date = item.date ? new Date(item.date) : new Date();
            const impressions = Number(item.impressions || 0);
            const clicks = Number(item.clicks || 0);
            const ctr = item.ctr !== undefined ? Number(item.ctr) : (impressions > 0 ? clicks / impressions : 0);
            const position = Number(item.position || 0);

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

        return NextResponse.json({ success: true, upserted, strategy });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to ingest metrics' }, { status: 500 });
    }
}

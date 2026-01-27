import { google } from 'googleapis';
import { prisma } from '../prisma';

export async function syncGscMetrics(options: { days?: number; startDate?: Date; endDate?: Date; refreshStrategy?: boolean } = {}) {
    const siteUrl = process.env.GSC_SITE_URL;
    const keyRaw = process.env.GSC_SERVICE_ACCOUNT_JSON || process.env.GSC_SERVICE_ACCOUNT_KEY;

    if (!siteUrl || !keyRaw) {
        throw new Error('Missing GSC_SITE_URL or service account key');
    }

    const endDate = options.endDate || new Date();
    const startDate = options.startDate || new Date(endDate.getTime() - (options.days || 7) * 24 * 60 * 60 * 1000);

    const credentials = parseCredentials(keyRaw);
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
    });

    const searchconsole = google.searchconsole({ version: 'v1', auth });

    const response = await searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            dimensions: ['page', 'date'],
            rowLimit: 25000
        }
    });

    const rows = response.data.rows || [];
    let upserted = 0;

    for (const row of rows) {
        const page = row.keys?.[0] as string | undefined;
        const date = row.keys?.[1] as string | undefined;
        if (!page || !date) continue;

        const slug = extractSlug(page);
        if (!slug) continue;

        const article = await prisma.article.findFirst({
            where: {
                OR: [{ slug }, { id: slug }]
            }
        });
        if (!article) continue;

        const impressions = Math.round(row.impressions || 0);
        const clicks = Math.round(row.clicks || 0);
        const ctr = row.ctr ?? (impressions > 0 ? clicks / impressions : 0);
        const position = row.position || 0;

        await prisma.articleMetric.upsert({
            where: {
                articleId_date_source: {
                    articleId: article.id,
                    date: new Date(date),
                    source: 'GSC'
                }
            },
            update: { impressions, clicks, ctr, position },
            create: {
                articleId: article.id,
                date: new Date(date),
                source: 'GSC',
                impressions,
                clicks,
                ctr,
                position
            }
        });

        upserted += 1;
    }

    return { upserted, rows: rows.length };
}

function formatDate(date: Date) {
    return date.toISOString().slice(0, 10);
}

function extractSlug(pageUrl: string) {
    try {
        const url = new URL(pageUrl);
        const parts = url.pathname.split('/').filter(Boolean);
        const blogIndex = parts.indexOf('blog');
        if (blogIndex === -1 || blogIndex === parts.length - 1) return null;
        return parts[blogIndex + 1];
    } catch {
        return null;
    }
}

function parseCredentials(raw: string) {
    if (raw.trim().startsWith('{')) {
        return JSON.parse(raw);
    }
    const decoded = Buffer.from(raw, 'base64').toString('utf-8');
    return JSON.parse(decoded);
}

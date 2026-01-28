import { google } from 'googleapis';
import { subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';

type ServiceAccount = {
    client_email: string;
    private_key: string;
};

type InspectionResult = {
    url: string;
    indexed: boolean;
    verdict?: string;
    coverageState?: string;
    lastCrawlTime?: string;
    error?: string;
};

export type SeoHealthReport = {
    status: 'GREEN' | 'YELLOW' | 'RED';
    indexRate: number;
    indexedCount: number;
    sampleCount: number;
    impressions: number;
    clicks: number;
    failedUrls: Array<{ url: string; reason: string }>;
    warnings: string[];
    window: { startDate: string; endDate: string };
};

const INSPECTION_SAMPLE = 50;
const INSPECTION_DAYS = 7;
const TRAFFIC_DAYS = 3;
const INSPECTION_CONCURRENCY = 5;
const INSPECTION_DAILY_LIMIT = Number(process.env.GSC_INSPECTION_DAILY_LIMIT || 2000);

function getServiceAccount(): ServiceAccount {
    const raw = process.env.GSC_SERVICE_ACCOUNT_JSON
        || process.env.GSC_SERVICE_ACCOUNT_KEY
        || (process.env.GSC_SERVICE_ACCOUNT_BASE64
            ? Buffer.from(process.env.GSC_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
            : undefined);

    if (raw) {
        const parsed = JSON.parse(raw);
        return { client_email: parsed.client_email, private_key: parsed.private_key };
    }

    const path = process.env.GSC_SERVICE_ACCOUNT_PATH;
    if (path) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require('fs');
        const parsed = JSON.parse(fs.readFileSync(path, 'utf8'));
        return { client_email: parsed.client_email, private_key: parsed.private_key };
    }

    throw new Error('Missing GSC service account JSON. Set GSC_SERVICE_ACCOUNT_JSON or GSC_SERVICE_ACCOUNT_PATH.');
}

function getSiteUrl(): string {
    const siteUrl = process.env.GSC_SITE_URL || process.env.NEXTAUTH_URL || process.env.SITE_URL;
    if (!siteUrl) throw new Error('Missing GSC_SITE_URL (or NEXTAUTH_URL/SITE_URL fallback).');
    return siteUrl;
}

function buildArticleUrl(baseUrl: string, slug: string) {
    const trimmed = slug.startsWith('/') ? slug.slice(1) : slug;
    return `${baseUrl}/blog/${trimmed}`;
}

function shuffle<T>(items: T[]): T[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

async function getRecentUrls(days: number, limit: number): Promise<string[]> {
    const since = subDays(new Date(), days);
    const baseUrl = getSiteUrl().replace(/\/$/, '');

    const candidates = await prisma.article.findMany({
        where: {
            createdAt: { gte: since },
            status: 'PUBLISHED',
            slug: { not: null }
        },
        select: { slug: true },
        orderBy: { createdAt: 'desc' },
        take: 500
    });

    const slugs = candidates
        .map(item => item.slug)
        .filter((slug): slug is string => !!slug && slug.trim().length > 0);

    const sample = shuffle(slugs).slice(0, limit);
    return sample.map(slug => buildArticleUrl(baseUrl, slug));
}

function buildAuth() {
    const { client_email, private_key } = getServiceAccount();
    return new google.auth.JWT({
        email: client_email,
        key: private_key,
        scopes: [
            'https://www.googleapis.com/auth/webmasters',
            'https://www.googleapis.com/auth/webmasters.readonly'
        ]
    });
}

function buildDateRange(days: number) {
    const endDate = subDays(new Date(), 1);
    const startDate = subDays(endDate, days - 1);
    const format = (d: Date) => d.toISOString().slice(0, 10);
    return { startDate: format(startDate), endDate: format(endDate) };
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = [];
    let index = 0;

    const workers = Array.from({ length: Math.min(limit, items.length) }).map(async () => {
        while (index < items.length) {
            const current = index;
            index += 1;
            results[current] = await fn(items[current]);
        }
    });

    await Promise.all(workers);
    return results;
}

async function inspectUrls(urls: string[]) {
    const auth = buildAuth();
    const searchconsole = google.searchconsole({ version: 'v1', auth });
    const siteUrl = getSiteUrl();
    const warnings: string[] = [];
    let rateLimited = false;

    const results = await mapWithConcurrency(urls, INSPECTION_CONCURRENCY, async (url): Promise<InspectionResult> => {
        if (rateLimited) {
            return { url, indexed: false, error: 'Skipped due to rate limit' };
        }
        try {
            const response = await searchconsole.urlInspection.index.inspect({
                requestBody: {
                    inspectionUrl: url,
                    siteUrl
                }
            });
            const status = response.data?.inspectionResult?.indexStatusResult;
            const verdict = status?.verdict || 'UNKNOWN';
            const indexed = verdict === 'PASS';
            return {
                url,
                indexed,
                verdict,
                coverageState: status?.coverageState ?? undefined,
                lastCrawlTime: status?.lastCrawlTime ?? undefined
            };
        } catch (error: any) {
            const message = error?.message || 'Unknown error';
            if (message.includes('429') || message.toLowerCase().includes('quota')) {
                rateLimited = true;
                warnings.push('Rate limit hit. Partial inspection results returned.');
            }
            return { url, indexed: false, error: message };
        }
    });

    return { results, warnings };
}

async function fetchTrafficTotals() {
    const auth = buildAuth();
    const searchconsole = google.searchconsole({ version: 'v1', auth });
    const siteUrl = getSiteUrl();
    const window = buildDateRange(TRAFFIC_DAYS);

    const response = await searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
            startDate: window.startDate,
            endDate: window.endDate,
            rowLimit: 250
        }
    });

    const rows = response.data?.rows || [];
    const totals = rows.reduce<{ impressions: number; clicks: number }>(
        (acc, row) => {
            acc.impressions += row.impressions || 0;
            acc.clicks += row.clicks || 0;
            return acc;
        },
        { impressions: 0, clicks: 0 }
    );

    return { ...totals, window };
}

function computeStatus(indexRate: number): SeoHealthReport['status'] {
    if (indexRate > 90) return 'GREEN';
    if (indexRate >= 60) return 'YELLOW';
    return 'RED';
}

async function reserveInspectionQuota(requested: number) {
    const dateKey = new Date().toISOString().slice(0, 10);
    const key = `gscInspectionUsage:${dateKey}`;

    try {
        const existing = await prisma.contentStrategy.findUnique({ where: { key } });
        const used = typeof existing?.value === 'object' && existing?.value
            ? Number((existing.value as any).count || 0)
            : 0;
        const remaining = Math.max(0, INSPECTION_DAILY_LIMIT - used);
        const allowed = Math.min(requested, remaining);
        const nextUsed = used + allowed;

        await prisma.contentStrategy.upsert({
            where: { key },
            update: { value: { count: nextUsed, updatedAt: new Date().toISOString() } as any },
            create: { key, value: { count: nextUsed, updatedAt: new Date().toISOString() } as any }
        });

        return { allowed, remaining, used };
    } catch (error) {
        console.warn('Quota tracking failed, proceeding without reservation.', error);
        return { allowed: requested, remaining: INSPECTION_DAILY_LIMIT, used: 0 };
    }
}

export async function getSeoHealthReport(): Promise<SeoHealthReport> {
    const { allowed, remaining } = await reserveInspectionQuota(INSPECTION_SAMPLE);
    const urls = allowed > 0 ? await getRecentUrls(INSPECTION_DAYS, allowed) : [];
    if (urls.length === 0) {
        const traffic = await fetchTrafficTotals();
        const warningList = [];
        if (allowed === 0) {
            warningList.push('Inspection quota exhausted for today; skipping URL inspection.');
        } else {
            warningList.push('No recent published URLs found in the last 7 days.');
        }
        return {
            status: 'YELLOW',
            indexRate: 0,
            indexedCount: 0,
            sampleCount: 0,
            impressions: traffic.impressions,
            clicks: traffic.clicks,
            failedUrls: [],
            warnings: warningList,
            window: traffic.window
        };
    }

    const [{ results, warnings: inspectWarnings }, traffic] = await Promise.all([
        inspectUrls(urls),
        fetchTrafficTotals()
    ]);

    const indexedCount = results.filter(result => result.indexed).length;
    const sampleCount = results.length;
    const indexRate = sampleCount > 0 ? Number(((indexedCount / sampleCount) * 100).toFixed(1)) : 0;
    const status = computeStatus(indexRate);

    const failedUrls = results
        .filter(result => !result.indexed)
        .map(result => ({
            url: result.url,
            reason: result.error || result.coverageState || result.verdict || 'Not indexed'
        }));

    const warningList = [...inspectWarnings];
    if (allowed < INSPECTION_SAMPLE) {
        warningList.push(`Inspection sample reduced to ${allowed} to respect the daily quota.`);
    }
    if (remaining <= 0) {
        warningList.push('Inspection quota exhausted for today; results may be stale.');
    }
    if (status === 'RED') {
        warningList.push('Index rate is below 60%. Consider pausing new publishing.');
    }

    return {
        status,
        indexRate,
        indexedCount,
        sampleCount,
        impressions: traffic.impressions,
        clicks: traffic.clicks,
        failedUrls,
        warnings: warningList,
        window: traffic.window
    };
}

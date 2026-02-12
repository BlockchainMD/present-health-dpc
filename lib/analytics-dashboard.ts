import crypto from "crypto";
import { google } from "googleapis";

import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_MONTHLY_DOLLARS } from "@/lib/pricing";
import { buildSitemapEntries } from "@/lib/sitemap";
import { US_STATES, stateFromNameOrCode } from "@/lib/us-states";

const ANALYTICS_CONFIG_KEY = "analytics:integration_config";
const ANALYTICS_GOOGLE_TOKENS_KEY = "analytics:google_oauth_tokens";

const GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
];

const BRANDED_QUERY_PATTERNS = [
    "present health",
    "present health dpc",
    "present health telehealth",
];

type GoogleOAuthTokens = {
    accessToken?: string;
    refreshToken?: string;
    scope?: string;
    tokenType?: string;
    idToken?: string;
    expiryDate?: number;
    email?: string;
    updatedAt?: string;
};

export type AnalyticsIntegrationConfig = {
    searchConsoleSiteUrl: string;
    ga4PropertyId: string;
    useGa4: boolean;
    useNativeFallback: boolean;
};

type GscRow = {
    metricDate: Date;
    page: string;
    query: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
};

type TrafficSource = "GA4" | "NATIVE";

type DateRangeInput = {
    from?: string | Date | null;
    to?: string | Date | null;
};

function compactWhitespace(value: unknown) {
    return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeOptionalString(value: unknown, maxLen = 1000) {
    const text = String(value ?? "").trim();
    if (!text) return null;
    return text.slice(0, maxLen);
}

function parseDate(value: unknown) {
    const text = compactWhitespace(value);
    if (!text) return null;
    const parsed = new Date(text);
    if (!Number.isFinite(parsed.getTime())) return null;
    return parsed;
}

function toUtcDay(value: Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0));
}

function toIsoDate(value: Date) {
    return toUtcDay(value).toISOString().slice(0, 10);
}

function addDays(value: Date, days: number) {
    return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

function rangeDaysInclusive(start: Date, end: Date) {
    const days: Date[] = [];
    let cursor = toUtcDay(start);
    const endDay = toUtcDay(end);
    while (cursor <= endDay) {
        days.push(cursor);
        cursor = addDays(cursor, 1);
    }
    return days;
}

function normalizePagePath(value: string) {
    const raw = compactWhitespace(value);
    if (!raw) return "/";

    const asUrl = (() => {
        try {
            return new URL(raw);
        } catch {
            return null;
        }
    })();

    let pathname = asUrl ? asUrl.pathname : raw;
    if (!pathname.startsWith("/")) pathname = `/${pathname}`;
    pathname = pathname.replace(/\/+/g, "/");
    if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
    return pathname || "/";
}

function parseGoogleDateYYYYMMDD(value: string) {
    const raw = compactWhitespace(value);
    if (!/^\d{8}$/.test(raw)) return null;
    const yyyy = Number.parseInt(raw.slice(0, 4), 10);
    const mm = Number.parseInt(raw.slice(4, 6), 10);
    const dd = Number.parseInt(raw.slice(6, 8), 10);
    const parsed = new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0, 0));
    if (!Number.isFinite(parsed.getTime())) return null;
    return parsed;
}

function parseDateRange(input: DateRangeInput, fallbackDays = 30) {
    const now = new Date();
    const to = parseDate(input.to) || toUtcDay(now);
    const from = parseDate(input.from) || addDays(to, -(fallbackDays - 1));

    const fromDay = toUtcDay(from);
    const toDay = toUtcDay(to);

    if (fromDay > toDay) {
        return {
            from: toDay,
            to: toDay,
        };
    }

    return { from: fromDay, to: toDay };
}

async function getStrategyValue(key: string) {
    const row = await prisma.contentStrategy.findUnique({ where: { key } });
    return row?.value as Record<string, unknown> | null;
}

async function setStrategyValue(key: string, value: Record<string, unknown>) {
    return prisma.contentStrategy.upsert({
        where: { key },
        create: { key, value: value as any },
        update: { value: value as any },
    });
}

function getDefaultSiteUrl() {
    const raw =
        process.env.GSC_SITE_URL ||
        process.env.SITE_URL ||
        process.env.NEXTAUTH_URL ||
        "";

    const trimmed = compactWhitespace(raw);
    if (!trimmed) return "";

    try {
        const parsed = new URL(trimmed);
        return `${parsed.origin}/`;
    } catch {
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return `https://${trimmed}`;
    }
}

function normalizeGa4PropertyId(value: unknown) {
    const raw = compactWhitespace(value);
    if (!raw) return "";

    const match = raw.match(/(\d{4,})/);
    return match?.[1] || "";
}

export async function getAnalyticsConfig(): Promise<AnalyticsIntegrationConfig> {
    const defaults: AnalyticsIntegrationConfig = {
        searchConsoleSiteUrl: getDefaultSiteUrl(),
        ga4PropertyId: compactWhitespace(process.env.GA4_PROPERTY_ID || ""),
        useGa4: Boolean(compactWhitespace(process.env.GA4_PROPERTY_ID || "")),
        useNativeFallback: true,
    };

    const value = await getStrategyValue(ANALYTICS_CONFIG_KEY);
    if (!value) return defaults;

    return {
        searchConsoleSiteUrl:
            normalizeOptionalString(value.searchConsoleSiteUrl, 400) || defaults.searchConsoleSiteUrl,
        ga4PropertyId:
            normalizeGa4PropertyId(value.ga4PropertyId) || normalizeGa4PropertyId(defaults.ga4PropertyId),
        useGa4:
            typeof value.useGa4 === "boolean" ? value.useGa4 : defaults.useGa4,
        useNativeFallback:
            typeof value.useNativeFallback === "boolean" ? value.useNativeFallback : defaults.useNativeFallback,
    };
}

export async function updateAnalyticsConfig(patch: Partial<AnalyticsIntegrationConfig>) {
    const current = await getAnalyticsConfig();

    const next: AnalyticsIntegrationConfig = {
        searchConsoleSiteUrl:
            patch.searchConsoleSiteUrl === undefined
                ? current.searchConsoleSiteUrl
                : normalizeOptionalString(patch.searchConsoleSiteUrl, 400) || "",
        ga4PropertyId:
            patch.ga4PropertyId === undefined
                ? current.ga4PropertyId
                : normalizeGa4PropertyId(patch.ga4PropertyId),
        useGa4:
            patch.useGa4 === undefined ? current.useGa4 : Boolean(patch.useGa4),
        useNativeFallback:
            patch.useNativeFallback === undefined
                ? current.useNativeFallback
                : Boolean(patch.useNativeFallback),
    };

    await setStrategyValue(ANALYTICS_CONFIG_KEY, {
        ...next,
        updatedAt: new Date().toISOString(),
    });

    return next;
}

async function getGoogleTokens(): Promise<GoogleOAuthTokens | null> {
    const value = await getStrategyValue(ANALYTICS_GOOGLE_TOKENS_KEY);
    if (!value) return null;

    return {
        accessToken: normalizeOptionalString(value.accessToken, 5000) || undefined,
        refreshToken: normalizeOptionalString(value.refreshToken, 5000) || undefined,
        scope: normalizeOptionalString(value.scope, 5000) || undefined,
        tokenType: normalizeOptionalString(value.tokenType, 120) || undefined,
        idToken: normalizeOptionalString(value.idToken, 8000) || undefined,
        expiryDate:
            typeof value.expiryDate === "number" && Number.isFinite(value.expiryDate)
                ? value.expiryDate
                : undefined,
        email: normalizeOptionalString(value.email, 254) || undefined,
        updatedAt: normalizeOptionalString(value.updatedAt, 100) || undefined,
    };
}

async function setGoogleTokens(tokens: GoogleOAuthTokens | null) {
    if (!tokens) {
        await prisma.contentStrategy.deleteMany({ where: { key: ANALYTICS_GOOGLE_TOKENS_KEY } });
        return;
    }

    await setStrategyValue(ANALYTICS_GOOGLE_TOKENS_KEY, {
        accessToken: tokens.accessToken || "",
        refreshToken: tokens.refreshToken || "",
        scope: tokens.scope || "",
        tokenType: tokens.tokenType || "",
        idToken: tokens.idToken || "",
        expiryDate: tokens.expiryDate || null,
        email: tokens.email || "",
        updatedAt: new Date().toISOString(),
    });
}

function getGoogleOAuthRedirectUri() {
    const env = compactWhitespace(process.env.GOOGLE_OAUTH_REDIRECT_URI || "");
    if (env) return env;

    const site = compactWhitespace(process.env.NEXTAUTH_URL || process.env.SITE_URL || "");
    if (!site) {
        throw new Error("Missing NEXTAUTH_URL or GOOGLE_OAUTH_REDIRECT_URI");
    }

    const base = site.replace(/\/$/, "");
    return `${base}/api/admin/analytics/oauth/callback`;
}

function getGoogleOAuthClient() {
    const clientId =
        compactWhitespace(process.env.GOOGLE_OAUTH_CLIENT_ID || "") ||
        compactWhitespace(process.env.GOOGLE_CLIENT_ID || "");
    const clientSecret =
        compactWhitespace(process.env.GOOGLE_OAUTH_CLIENT_SECRET || "") ||
        compactWhitespace(process.env.GOOGLE_CLIENT_SECRET || "");

    if (!clientId || !clientSecret) {
        throw new Error("Missing GOOGLE_OAUTH_CLIENT_ID/GOOGLE_OAUTH_CLIENT_SECRET");
    }

    return new google.auth.OAuth2(clientId, clientSecret, getGoogleOAuthRedirectUri());
}

async function getAuthorizedGoogleClient() {
    const tokens = await getGoogleTokens();
    if (!tokens?.refreshToken && !tokens?.accessToken) return null;

    const oauth = getGoogleOAuthClient();
    oauth.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        scope: tokens.scope,
        token_type: tokens.tokenType,
        id_token: tokens.idToken,
        expiry_date: tokens.expiryDate,
    });

    await oauth.getAccessToken();

    const credentials = oauth.credentials || {};
    await setGoogleTokens({
        accessToken: credentials.access_token || tokens.accessToken,
        refreshToken: credentials.refresh_token || tokens.refreshToken,
        scope: credentials.scope || tokens.scope,
        tokenType: credentials.token_type || tokens.tokenType,
        idToken: credentials.id_token || tokens.idToken,
        expiryDate: credentials.expiry_date || tokens.expiryDate,
        email: tokens.email,
    });

    return oauth;
}

export async function getAnalyticsIntegrationStatus() {
    const [config, tokens] = await Promise.all([getAnalyticsConfig(), getGoogleTokens()]);

    const connected = Boolean(tokens?.refreshToken || tokens?.accessToken);
    const expiresAt =
        typeof tokens?.expiryDate === "number" && Number.isFinite(tokens.expiryDate)
            ? new Date(tokens.expiryDate).toISOString()
            : null;

    let siteOptions: Array<{ siteUrl: string; permissionLevel: string | null }> = [];
    let googleEmail = tokens?.email || null;

    if (connected) {
        try {
            const oauth = await getAuthorizedGoogleClient();
            if (oauth) {
                const [sitesRes, userInfoRes] = await Promise.all([
                    google.searchconsole({ version: "v1", auth: oauth }).sites.list().catch(() => null),
                    google.oauth2({ version: "v2", auth: oauth }).userinfo.get().catch(() => null),
                ]);

                siteOptions = (sitesRes?.data?.siteEntry || []).map((entry) => ({
                    siteUrl: String(entry?.siteUrl || ""),
                    permissionLevel: entry?.permissionLevel || null,
                }));

                googleEmail = userInfoRes?.data?.email || googleEmail;

                if (googleEmail && googleEmail !== tokens?.email) {
                    await setGoogleTokens({ ...tokens, email: googleEmail });
                }
            }
        } catch {
            // Keep status available even if API ping fails.
        }
    }

    return {
        connected,
        googleEmail,
        scopes: tokens?.scope || "",
        expiresAt,
        config,
        siteOptions,
    };
}

export function createAnalyticsOAuthState() {
    return crypto.randomBytes(24).toString("hex");
}

export function buildGoogleAnalyticsAuthUrl(state: string) {
    const oauth = getGoogleOAuthClient();
    return oauth.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: true,
        scope: GOOGLE_SCOPES,
        state,
    });
}

export async function exchangeGoogleOAuthCode(code: string) {
    const oauth = getGoogleOAuthClient();
    const { tokens } = await oauth.getToken(code);

    const current = await getGoogleTokens();

    const normalized: GoogleOAuthTokens = {
        accessToken: tokens.access_token || current?.accessToken,
        refreshToken: tokens.refresh_token || current?.refreshToken,
        scope: tokens.scope || current?.scope,
        tokenType: tokens.token_type || current?.tokenType,
        idToken: tokens.id_token || current?.idToken,
        expiryDate: tokens.expiry_date || current?.expiryDate,
        email: current?.email,
    };

    oauth.setCredentials({
        access_token: normalized.accessToken,
        refresh_token: normalized.refreshToken,
        scope: normalized.scope,
        token_type: normalized.tokenType,
        id_token: normalized.idToken,
        expiry_date: normalized.expiryDate,
    });

    try {
        const userInfo = await google.oauth2({ version: "v2", auth: oauth }).userinfo.get();
        if (userInfo?.data?.email) normalized.email = userInfo.data.email;
    } catch {
        // ignore
    }

    await setGoogleTokens(normalized);
    return normalized;
}

export async function disconnectGoogleAnalyticsIntegration() {
    await setGoogleTokens(null);
}

async function syncSearchConsoleDay(input: {
    oauth: any;
    siteUrl: string;
    day: Date;
    rowLimit: number;
}) {
    const dateString = toIsoDate(input.day);
    const searchconsole = google.searchconsole({ version: "v1", auth: input.oauth });

    const response = await searchconsole.searchanalytics.query({
        siteUrl: input.siteUrl,
        requestBody: {
            startDate: dateString,
            endDate: dateString,
            dimensions: ["page", "query"],
            rowLimit: input.rowLimit,
        },
    });

    const rows = response.data?.rows || [];

    const normalizedRows: GscRow[] = rows
        .map((row) => {
            const pageRaw = String(row.keys?.[0] || "");
            const queryRaw = String(row.keys?.[1] || "");

            const page = normalizePagePath(pageRaw);
            const query = compactWhitespace(queryRaw).toLowerCase();

            const impressions = Math.max(0, Math.round(Number(row.impressions || 0)));
            const clicks = Math.max(0, Math.round(Number(row.clicks || 0)));
            const ctr = Number.isFinite(row.ctr as number)
                ? Number(row.ctr)
                : impressions > 0
                    ? clicks / impressions
                    : 0;
            const position = Number.isFinite(row.position as number) ? Number(row.position) : 0;

            return {
                metricDate: toUtcDay(input.day),
                page,
                query,
                impressions,
                clicks,
                ctr,
                position,
            };
        })
        .filter((row) => row.page && row.query);

    const totals = normalizedRows.reduce(
        (acc, row) => {
            acc.impressions += row.impressions;
            acc.clicks += row.clicks;
            acc.positionWeighted += row.position * (row.impressions || 1);
            return acc;
        },
        { impressions: 0, clicks: 0, positionWeighted: 0 }
    );

    const avgPosition = totals.impressions > 0 ? totals.positionWeighted / totals.impressions : 0;
    const ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;

    const tx: any[] = [
        prisma.searchConsolePageQueryDaily.deleteMany({
            where: { metricDate: toUtcDay(input.day) },
        }),
        prisma.searchConsoleDailySummary.upsert({
            where: { metricDate: toUtcDay(input.day) },
            update: {
                impressions: totals.impressions,
                clicks: totals.clicks,
                ctr,
                position: avgPosition,
                rowCount: normalizedRows.length,
            },
            create: {
                metricDate: toUtcDay(input.day),
                impressions: totals.impressions,
                clicks: totals.clicks,
                ctr,
                position: avgPosition,
                rowCount: normalizedRows.length,
            },
        }),
    ];

    if (normalizedRows.length) {
        tx.splice(1, 0, prisma.searchConsolePageQueryDaily.createMany({ data: normalizedRows }));
    }

    await prisma.$transaction(tx);

    return {
        date: dateString,
        rowCount: normalizedRows.length,
        impressions: totals.impressions,
        clicks: totals.clicks,
    };
}

async function syncSearchConsoleRange(options: {
    from: Date;
    to: Date;
    siteUrl: string;
    rowLimit?: number;
}) {
    const oauth = await getAuthorizedGoogleClient();
    if (!oauth) {
        throw new Error("Google OAuth is not connected");
    }

    const dayList = rangeDaysInclusive(options.from, options.to);
    const rowLimit = Math.max(100, Math.min(25000, Math.trunc(options.rowLimit || 25000)));

    const days: Array<{ date: string; rowCount: number; impressions: number; clicks: number }> = [];
    let totalRows = 0;
    let totalImpressions = 0;
    let totalClicks = 0;

    for (const day of dayList) {
        const result = await syncSearchConsoleDay({
            oauth,
            siteUrl: options.siteUrl,
            day,
            rowLimit,
        });
        days.push(result);
        totalRows += result.rowCount;
        totalImpressions += result.impressions;
        totalClicks += result.clicks;
    }

    return {
        syncedDays: dayList.length,
        totalRows,
        totalImpressions,
        totalClicks,
        days,
    };
}

async function syncGa4Range(options: {
    from: Date;
    to: Date;
    ga4PropertyId: string;
}) {
    const oauth = await getAuthorizedGoogleClient();
    if (!oauth) {
        throw new Error("Google OAuth is not connected");
    }

    const ga4PropertyId = normalizeGa4PropertyId(options.ga4PropertyId);
    if (!ga4PropertyId) {
        throw new Error("GA4 property ID is not configured");
    }

    const analyticsData = google.analyticsdata({ version: "v1beta", auth: oauth });

    const fromDate = toIsoDate(options.from);
    const toDate = toIsoDate(options.to);

    const response = await analyticsData.properties.runReport({
        property: `properties/${ga4PropertyId}`,
        requestBody: {
            dateRanges: [{ startDate: fromDate, endDate: toDate }],
            dimensions: [{ name: "date" }, { name: "pagePath" }],
            metrics: [
                { name: "screenPageViews" },
                { name: "totalUsers" },
                { name: "userEngagementDuration" },
            ],
            limit: "100000",
            orderBys: [
                {
                    dimension: { dimensionName: "date" },
                },
            ],
        },
    });

    const rows = response.data?.rows || [];

    const data = rows
        .map((row) => {
            const dateValue = String(row.dimensionValues?.[0]?.value || "");
            const pageValue = String(row.dimensionValues?.[1]?.value || "");
            const parsedDate = parseGoogleDateYYYYMMDD(dateValue);
            if (!parsedDate) return null;

            const pagePath = normalizePagePath(pageValue || "/");
            const pageViews = Math.max(0, Math.round(Number(row.metricValues?.[0]?.value || 0)));
            const users = Math.max(0, Math.round(Number(row.metricValues?.[1]?.value || 0)));
            const engagementDuration = Math.max(0, Number(row.metricValues?.[2]?.value || 0));

            return {
                metricDate: toUtcDay(parsedDate),
                pagePath,
                pageViews,
                uniqueVisitors: users,
                avgEngagementSec: users > 0 ? engagementDuration / users : null,
                source: "GA4",
            };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row));

    await prisma.$transaction([
        prisma.analyticsTrafficDaily.deleteMany({
            where: {
                source: "GA4",
                metricDate: {
                    gte: toUtcDay(options.from),
                    lte: toUtcDay(options.to),
                },
            },
        }),
        ...(data.length ? [prisma.analyticsTrafficDaily.createMany({ data })] : []),
    ]);

    const totals = data.reduce(
        (acc, row) => {
            acc.pageViews += row.pageViews;
            acc.uniqueVisitors += row.uniqueVisitors;
            acc.count += 1;
            return acc;
        },
        { pageViews: 0, uniqueVisitors: 0, count: 0 }
    );

    return {
        rows: data.length,
        pageViews: totals.pageViews,
        uniqueVisitors: totals.uniqueVisitors,
        from: fromDate,
        to: toDate,
    };
}

export async function syncAnalyticsCache(options?: {
    from?: string | Date;
    to?: string | Date;
    days?: number;
    includeGa4?: boolean;
}) {
    const config = await getAnalyticsConfig();

    const dateRange = (() => {
        if (options?.from || options?.to) return parseDateRange({ from: options.from || null, to: options.to || null }, 30);
        if (options?.days && Number.isFinite(options.days) && options.days > 0) {
            const to = toUtcDay(new Date());
            return { from: addDays(to, -(Math.trunc(options.days) - 1)), to };
        }
        return parseDateRange({}, 14);
    })();

    if (!config.searchConsoleSiteUrl) {
        throw new Error("Search Console site URL is not configured");
    }

    const searchConsole = await syncSearchConsoleRange({
        from: dateRange.from,
        to: dateRange.to,
        siteUrl: config.searchConsoleSiteUrl,
    });

    let ga4: any = null;
    const shouldIncludeGa4 =
        options?.includeGa4 !== undefined ? Boolean(options.includeGa4) : Boolean(config.useGa4);

    if (shouldIncludeGa4 && config.ga4PropertyId) {
        try {
            ga4 = await syncGa4Range({
                from: dateRange.from,
                to: dateRange.to,
                ga4PropertyId: config.ga4PropertyId,
            });
        } catch (error: any) {
            ga4 = {
                error: String(error?.message || error),
            };
        }
    }

    return {
        from: toIsoDate(dateRange.from),
        to: toIsoDate(dateRange.to),
        searchConsole,
        ga4,
    };
}

function initializeAggregate() {
    return {
        impressions: 0,
        clicks: 0,
        positionWeighted: 0,
    };
}

function aggregateFromRows(rows: GscRow[]) {
    const totals = initializeAggregate();
    const byDay = new Map<string, ReturnType<typeof initializeAggregate>>();
    const byQuery = new Map<string, ReturnType<typeof initializeAggregate>>();
    const byPage = new Map<string, ReturnType<typeof initializeAggregate>>();
    const byPageQuery = new Map<string, Map<string, ReturnType<typeof initializeAggregate>>>();

    for (const row of rows) {
        totals.impressions += row.impressions;
        totals.clicks += row.clicks;
        totals.positionWeighted += row.position * (row.impressions || 1);

        const dayKey = toIsoDate(row.metricDate);
        const day = byDay.get(dayKey) || initializeAggregate();
        day.impressions += row.impressions;
        day.clicks += row.clicks;
        day.positionWeighted += row.position * (row.impressions || 1);
        byDay.set(dayKey, day);

        const query = row.query || "(not set)";
        const queryAgg = byQuery.get(query) || initializeAggregate();
        queryAgg.impressions += row.impressions;
        queryAgg.clicks += row.clicks;
        queryAgg.positionWeighted += row.position * (row.impressions || 1);
        byQuery.set(query, queryAgg);

        const page = row.page || "/";
        const pageAgg = byPage.get(page) || initializeAggregate();
        pageAgg.impressions += row.impressions;
        pageAgg.clicks += row.clicks;
        pageAgg.positionWeighted += row.position * (row.impressions || 1);
        byPage.set(page, pageAgg);

        const pageQueries = byPageQuery.get(page) || new Map<string, ReturnType<typeof initializeAggregate>>();
        const pageQueryAgg = pageQueries.get(query) || initializeAggregate();
        pageQueryAgg.impressions += row.impressions;
        pageQueryAgg.clicks += row.clicks;
        pageQueryAgg.positionWeighted += row.position * (row.impressions || 1);
        pageQueries.set(query, pageQueryAgg);
        byPageQuery.set(page, pageQueries);
    }

    return {
        totals,
        byDay,
        byQuery,
        byPage,
        byPageQuery,
    };
}

function finalizeAggregate(aggregate: ReturnType<typeof initializeAggregate>) {
    const impressions = aggregate.impressions;
    const clicks = aggregate.clicks;
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const position = impressions > 0 ? aggregate.positionWeighted / impressions : 0;
    return { impressions, clicks, ctr, position };
}

function resolveStateFilter(stateFilter: string | null | undefined) {
    const raw = compactWhitespace(stateFilter);
    if (!raw || raw.toLowerCase() === "all") return null;

    const state = stateFromNameOrCode(raw);
    if (state) {
        return {
            name: state.name.toLowerCase(),
            code: state.code.toLowerCase(),
        };
    }

    return {
        name: raw.toLowerCase(),
        code: "",
    };
}

function queryMatchesStateFilter(query: string, stateFilter: ReturnType<typeof resolveStateFilter>) {
    if (!stateFilter) return true;
    const q = query.toLowerCase();
    if (q.includes(stateFilter.name)) return true;
    if (stateFilter.code && q.includes(` ${stateFilter.code.toLowerCase()} `)) return true;
    if (stateFilter.code && q.endsWith(` ${stateFilter.code.toLowerCase()}`)) return true;
    return false;
}

function queryIsBranded(query: string) {
    const q = query.toLowerCase();
    return BRANDED_QUERY_PATTERNS.some((term) => q.includes(term));
}

function monthKey(date: Date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
    const [yyyy, mm] = key.split("-").map((x) => Number.parseInt(x, 10));
    const d = new Date(Date.UTC(yyyy, (mm || 1) - 1, 1));
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function createMonthRange(from: Date, to: Date) {
    const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1, 0, 0, 0, 0));

    const keys: string[] = [];
    let cursor = start;
    while (cursor <= end) {
        keys.push(monthKey(cursor));
        cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    }
    return keys;
}

function normalizeRate(value: number, max: number) {
    if (!Number.isFinite(value) || max <= 0) return 0;
    return Math.max(0, Math.min(1, value / max));
}

export async function getAnalyticsDashboardData(options?: {
    from?: string | Date | null;
    to?: string | Date | null;
    compare?: boolean;
    stateFilter?: string | null;
}) {
    const compare = options?.compare !== false;
    const dateRange = parseDateRange({ from: options?.from || null, to: options?.to || null }, 30);
    const stateFilter = resolveStateFilter(options?.stateFilter);

    const days = Math.max(1, Math.floor((dateRange.to.getTime() - dateRange.from.getTime()) / (24 * 60 * 60 * 1000)) + 1);
    const previousFrom = addDays(dateRange.from, -days);
    const previousTo = addDays(dateRange.to, -days);

    const [
        currentRows,
        previousRows,
        trafficRows,
        articles,
        leads,
        aiLogs,
        sitemapEntries,
        config,
        status,
    ] = await Promise.all([
        prisma.searchConsolePageQueryDaily.findMany({
            where: {
                metricDate: {
                    gte: dateRange.from,
                    lte: dateRange.to,
                },
            },
            select: {
                metricDate: true,
                page: true,
                query: true,
                impressions: true,
                clicks: true,
                ctr: true,
                position: true,
            },
        }),
        compare
            ? prisma.searchConsolePageQueryDaily.findMany({
                where: {
                    metricDate: {
                        gte: previousFrom,
                        lte: previousTo,
                    },
                },
                select: {
                    metricDate: true,
                    page: true,
                    query: true,
                    impressions: true,
                    clicks: true,
                    ctr: true,
                    position: true,
                },
            })
            : Promise.resolve([]),
        prisma.analyticsTrafficDaily.findMany({
            where: {
                metricDate: {
                    gte: previousFrom,
                    lte: dateRange.to,
                },
            },
            select: {
                metricDate: true,
                pagePath: true,
                pageViews: true,
                uniqueVisitors: true,
                avgEngagementSec: true,
                source: true,
            },
        }),
        prisma.article.findMany({
            where: {
                status: "PUBLISHED",
                slug: { not: null },
            },
            select: {
                id: true,
                slug: true,
                title: true,
                updatedAt: true,
                publishedAt: true,
                category: true,
            },
            orderBy: { updatedAt: "desc" },
            take: 500,
        }),
        prisma.unifiedLead.findMany({
            where: {
                OR: [
                    { createdAt: { gte: previousFrom, lte: dateRange.to } },
                    { enrolledAt: { gte: previousFrom, lte: dateRange.to } },
                ],
            },
            select: {
                id: true,
                createdAt: true,
                enrolledAt: true,
                status: true,
                sourcePage: true,
                monthlyMembershipRate: true,
                sourceMeta: true,
            },
        }),
        prisma.aiOverviewObservation.findMany({
            where: {
                dateSpotted: {
                    gte: addDays(dateRange.from, -180),
                    lte: dateRange.to,
                },
            },
            orderBy: { dateSpotted: "desc" },
            take: 1000,
        }),
        buildSitemapEntries(),
        getAnalyticsConfig(),
        getAnalyticsIntegrationStatus(),
    ]);

    const currentTyped: GscRow[] = currentRows.map((row) => ({
        metricDate: toUtcDay(new Date(row.metricDate)),
        page: normalizePagePath(row.page),
        query: compactWhitespace(row.query || ""),
        impressions: row.impressions || 0,
        clicks: row.clicks || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
    }));

    const previousTyped: GscRow[] = previousRows.map((row) => ({
        metricDate: toUtcDay(new Date(row.metricDate)),
        page: normalizePagePath(row.page),
        query: compactWhitespace(row.query || ""),
        impressions: row.impressions || 0,
        clicks: row.clicks || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
    }));

    const currentAgg = aggregateFromRows(currentTyped);
    const previousAgg = aggregateFromRows(previousTyped);

    const currentTotals = finalizeAggregate(currentAgg.totals);
    const previousTotals = finalizeAggregate(previousAgg.totals);

    const queryList = Array.from(currentAgg.byQuery.entries())
        .map(([query, agg]) => ({ query, ...finalizeAggregate(agg) }))
        .filter((item) => queryMatchesStateFilter(item.query, stateFilter))
        .sort((a, b) => (b.clicks - a.clicks) || (b.impressions - a.impressions))
        .slice(0, 150);

    const pageList = Array.from(currentAgg.byPage.entries())
        .map(([page, agg]) => ({ page, ...finalizeAggregate(agg) }))
        .sort((a, b) => (b.clicks - a.clicks) || (b.impressions - a.impressions))
        .slice(0, 150);

    const dayKeysCurrent = rangeDaysInclusive(dateRange.from, dateRange.to).map((day) => toIsoDate(day));
    const dayKeysPrevious = rangeDaysInclusive(previousFrom, previousTo).map((day) => toIsoDate(day));

    const chartDaily = dayKeysCurrent.map((dayKey, index) => {
        const curr = finalizeAggregate(currentAgg.byDay.get(dayKey) || initializeAggregate());
        const prevDayKey = dayKeysPrevious[index] || "";
        const prev = finalizeAggregate(previousAgg.byDay.get(prevDayKey) || initializeAggregate());

        return {
            date: dayKey,
            impressions: curr.impressions,
            clicks: curr.clicks,
            previousImpressions: prev.impressions,
            previousClicks: prev.clicks,
        };
    });

    const brandedByDay = new Map<string, ReturnType<typeof initializeAggregate>>();
    for (const row of currentTyped) {
        if (!queryIsBranded(row.query)) continue;
        const dayKey = toIsoDate(row.metricDate);
        const current = brandedByDay.get(dayKey) || initializeAggregate();
        current.impressions += row.impressions;
        current.clicks += row.clicks;
        current.positionWeighted += row.position * (row.impressions || 1);
        brandedByDay.set(dayKey, current);
    }

    const brandedDaily = dayKeysCurrent.map((dayKey) => {
        const agg = finalizeAggregate(brandedByDay.get(dayKey) || initializeAggregate());
        return {
            date: dayKey,
            impressions: agg.impressions,
            clicks: agg.clicks,
            ctr: agg.ctr,
            position: agg.position,
        };
    });

    const brandedTotalsAgg = Array.from(brandedByDay.values()).reduce(
        (acc, item) => {
            acc.impressions += item.impressions;
            acc.clicks += item.clicks;
            acc.positionWeighted += item.positionWeighted;
            return acc;
        },
        initializeAggregate()
    );
    const brandedTotals = finalizeAggregate(brandedTotalsAgg);

    const recent60From = addDays(dateRange.to, -59);
    const recent60Rows = await prisma.searchConsolePageQueryDaily.findMany({
        where: {
            metricDate: {
                gte: recent60From,
                lte: dateRange.to,
            },
        },
        select: {
            metricDate: true,
            page: true,
            query: true,
            impressions: true,
            clicks: true,
            position: true,
        },
    });

    const midpoint = addDays(dateRange.to, -29);
    const prevWindowFrom = addDays(midpoint, -30);

    const recentByPageCurrent = new Map<string, ReturnType<typeof initializeAggregate>>();
    const recentByPagePrevious = new Map<string, ReturnType<typeof initializeAggregate>>();

    for (const row of recent60Rows) {
        const page = normalizePagePath(row.page);
        const metricDate = toUtcDay(new Date(row.metricDate));
        const isCurrent = metricDate >= midpoint;
        const isPrevious = metricDate >= prevWindowFrom && metricDate < midpoint;
        if (!isCurrent && !isPrevious) continue;

        const targetMap = isCurrent ? recentByPageCurrent : recentByPagePrevious;
        const target = targetMap.get(page) || initializeAggregate();
        target.impressions += row.impressions || 0;
        target.clicks += row.clicks || 0;
        target.positionWeighted += (row.position || 0) * ((row.impressions || 0) || 1);
        targetMap.set(page, target);
    }

    const sitemapMap = new Map(
        sitemapEntries.map((entry) => [normalizePagePath(entry.path), entry])
    );

    const pagePerformance = Array.from(sitemapMap.entries()).map(([path, entry]) => {
        const current = finalizeAggregate(currentAgg.byPage.get(path) || initializeAggregate());
        const previous = finalizeAggregate(previousAgg.byPage.get(path) || initializeAggregate());

        const recCurrent = finalizeAggregate(recentByPageCurrent.get(path) || initializeAggregate());
        const recPrevious = finalizeAggregate(recentByPagePrevious.get(path) || initializeAggregate());

        const positionDrop = recCurrent.position - recPrevious.position;

        const queryMap = currentAgg.byPageQuery.get(path) || new Map<string, ReturnType<typeof initializeAggregate>>();
        const topQuery = Array.from(queryMap.entries())
            .map(([query, agg]) => ({ query, ...finalizeAggregate(agg) }))
            .sort((a, b) => (b.impressions - a.impressions) || (b.clicks - a.clicks))[0];

        const freshnessDays = Math.max(
            0,
            Math.floor((Date.now() - new Date(entry.lastmod).getTime()) / (24 * 60 * 60 * 1000))
        );

        const flagDecliningPosition = positionDrop > 5;
        const flagHighImpressionLowCtr = current.impressions >= 500 && current.ctr <= 0.0125;
        const flagHighCtrLowImpression = current.ctr >= 0.08 && current.impressions <= 100;

        return {
            path,
            pageType: entry.type,
            lastmod: entry.lastmod.toISOString(),
            freshnessDays,
            targetKeyword: topQuery?.query || null,
            targetKeywordPosition: topQuery?.position || null,
            impressions: current.impressions,
            clicks: current.clicks,
            ctr: current.ctr,
            avgPosition: current.position,
            previousAvgPosition: previous.position,
            positionDrop,
            flagDecliningPosition,
            flagHighImpressionLowCtr,
            flagHighCtrLowImpression,
        };
    });

    pagePerformance.sort((a, b) => (b.clicks - a.clicks) || (b.impressions - a.impressions));

    const trafficByDayGa4 = new Map<string, { pageViews: number; engagementWeighted: number; users: number }>();
    const trafficByDayNative = new Map<string, { pageViews: number; engagementWeighted: number; users: number }>();
    const pageEngagementByPath = new Map<string, { pageViews: number; engagementWeighted: number }>();

    for (const row of trafficRows) {
        const dayKey = toIsoDate(new Date(row.metricDate));
        const source = row.source === "GA4" ? "GA4" : "NATIVE";
        const targetMap = source === "GA4" ? trafficByDayGa4 : trafficByDayNative;

        const agg = targetMap.get(dayKey) || { pageViews: 0, engagementWeighted: 0, users: 0 };
        agg.pageViews += row.pageViews || 0;
        agg.users += row.uniqueVisitors || 0;
        agg.engagementWeighted += (row.avgEngagementSec || 0) * (row.pageViews || 0);
        targetMap.set(dayKey, agg);

        if (source === "GA4") {
            const pagePath = normalizePagePath(row.pagePath);
            const pageAgg = pageEngagementByPath.get(pagePath) || { pageViews: 0, engagementWeighted: 0 };
            pageAgg.pageViews += row.pageViews || 0;
            pageAgg.engagementWeighted += (row.avgEngagementSec || 0) * (row.pageViews || 0);
            pageEngagementByPath.set(pagePath, pageAgg);
        }
    }

    const useGa4Traffic = config.useGa4 && Array.from(trafficByDayGa4.values()).some((item) => item.pageViews > 0);
    const trafficSource: TrafficSource = useGa4Traffic ? "GA4" : "NATIVE";

    const monthKeys = createMonthRange(addDays(dateRange.to, -180), dateRange.to);

    const monthlyTraffic = new Map<string, number>();

    const dayMapForTraffic = useGa4Traffic ? trafficByDayGa4 : trafficByDayNative;
    for (const [dayKey, agg] of dayMapForTraffic.entries()) {
        const parsed = parseDate(dayKey);
        if (!parsed) continue;
        const key = monthKey(parsed);
        monthlyTraffic.set(key, (monthlyTraffic.get(key) || 0) + agg.pageViews);
    }

    const monthlyLeads = new Map<string, number>();
    const monthlyEnrollments = new Map<string, { count: number; mrr: number }>();
    const pageEnrollments = new Map<string, { enrollments: number; mrr: number }>();
    const queryEnrollments = new Map<string, { enrollments: number; mrr: number }>();

    for (const lead of leads) {
        const createdMonth = monthKey(new Date(lead.createdAt));
        monthlyLeads.set(createdMonth, (monthlyLeads.get(createdMonth) || 0) + 1);

        const enrolledAt = lead.enrolledAt ? new Date(lead.enrolledAt) : null;
        const isEnrolled = lead.status === "ENROLLED" || Boolean(enrolledAt);
        if (isEnrolled) {
            const month = monthKey(enrolledAt || new Date(lead.createdAt));
            const rate = lead.monthlyMembershipRate || MEMBERSHIP_MONTHLY_DOLLARS;
            const current = monthlyEnrollments.get(month) || { count: 0, mrr: 0 };
            current.count += 1;
            current.mrr += rate;
            monthlyEnrollments.set(month, current);

            const sourcePage = normalizeOptionalString(lead.sourcePage, 500);
            if (sourcePage) {
                const page = normalizePagePath(sourcePage);
                const pageCurrent = pageEnrollments.get(page) || { enrollments: 0, mrr: 0 };
                pageCurrent.enrollments += 1;
                pageCurrent.mrr += rate;
                pageEnrollments.set(page, pageCurrent);
            }

            const sourceMeta = (lead.sourceMeta || {}) as Record<string, unknown>;
            const maybeQuery =
                normalizeOptionalString(sourceMeta.query, 400) ||
                normalizeOptionalString(sourceMeta.searchQuery, 400) ||
                normalizeOptionalString(sourceMeta.keyword, 400) ||
                normalizeOptionalString(sourceMeta.utmTerm, 400);
            if (maybeQuery) {
                const queryKey = maybeQuery.toLowerCase();
                const queryCurrent = queryEnrollments.get(queryKey) || { enrollments: 0, mrr: 0 };
                queryCurrent.enrollments += 1;
                queryCurrent.mrr += rate;
                queryEnrollments.set(queryKey, queryCurrent);
            }
        }
    }

    let runningMrr = 0;
    const revenueCorrelation = monthKeys.map((key) => {
        const enroll = monthlyEnrollments.get(key) || { count: 0, mrr: 0 };
        runningMrr += enroll.mrr;

        return {
            month: key,
            label: monthLabel(key),
            traffic: monthlyTraffic.get(key) || 0,
            leads: monthlyLeads.get(key) || 0,
            enrollments: enroll.count,
            newMrr: enroll.mrr,
            mrr: runningMrr,
        };
    });

    const topEnrollmentPages = Array.from(pageEnrollments.entries())
        .map(([path, row]) => ({
            path,
            enrollments: row.enrollments,
            mrr: row.mrr,
        }))
        .sort((a, b) => (b.enrollments - a.enrollments) || (b.mrr - a.mrr))
        .slice(0, 20);

    const topEnrollmentQueries = Array.from(queryEnrollments.entries())
        .map(([query, row]) => ({
            query,
            enrollments: row.enrollments,
            mrr: row.mrr,
        }))
        .sort((a, b) => (b.enrollments - a.enrollments) || (b.mrr - a.mrr))
        .slice(0, 20);

    const articleRows = articles
        .filter((article): article is typeof article & { slug: string } => Boolean(article.slug))
        .map((article) => {
            const path = normalizePagePath(`/learn/${article.slug}`);
            const page = finalizeAggregate(currentAgg.byPage.get(path) || initializeAggregate());
            const prev = finalizeAggregate(previousAgg.byPage.get(path) || initializeAggregate());

            const engagement = pageEngagementByPath.get(path);
            const avgEngagementSec =
                engagement && engagement.pageViews > 0
                    ? engagement.engagementWeighted / engagement.pageViews
                    : null;

            const leadCount = leads.filter((lead) => normalizeOptionalString(lead.sourcePage, 500) === path).length;
            const enrolledCount = leads.filter(
                (lead) =>
                    normalizeOptionalString(lead.sourcePage, 500) === path &&
                    (lead.status === "ENROLLED" || Boolean(lead.enrolledAt))
            ).length;

            const freshnessDays = Math.max(
                0,
                Math.floor((Date.now() - new Date(article.updatedAt).getTime()) / (24 * 60 * 60 * 1000))
            );

            const recentCurrent = finalizeAggregate(recentByPageCurrent.get(path) || initializeAggregate());
            const recentPrev = finalizeAggregate(recentByPagePrevious.get(path) || initializeAggregate());
            const decliningTraffic = recentCurrent.clicks < recentPrev.clicks;

            return {
                articleId: article.id,
                title: article.title,
                slug: article.slug,
                path,
                category: article.category,
                updatedAt: article.updatedAt.toISOString(),
                freshnessDays,
                clicks: page.clicks,
                impressions: page.impressions,
                ctr: page.ctr,
                avgPosition: page.position,
                previousClicks: prev.clicks,
                avgEngagementSec,
                leads: leadCount,
                enrollments: enrolledCount,
                decliningTraffic,
                dueRefresh: freshnessDays > 90 && decliningTraffic,
            };
        });

    const maxTraffic = Math.max(1, ...articleRows.map((row) => row.clicks));
    const maxEngagement = Math.max(1, ...articleRows.map((row) => row.avgEngagementSec || 0));
    const maxLeads = Math.max(1, ...articleRows.map((row) => row.leads));

    const rankedArticles = articleRows
        .map((row) => {
            const trafficScore = normalizeRate(row.clicks, maxTraffic);
            const engagementScore = normalizeRate(row.avgEngagementSec || 0, maxEngagement);
            const leadScore = normalizeRate(row.leads, maxLeads);
            const contentRoiScore = Number((trafficScore * 0.45 + engagementScore * 0.2 + leadScore * 0.35).toFixed(3));
            return {
                ...row,
                contentRoiScore,
            };
        })
        .sort((a, b) => (b.contentRoiScore - a.contentRoiScore) || (b.clicks - a.clicks))
        .slice(0, 300);

    const aiOverviewByMonth = new Map<string, number>();
    for (const row of aiLogs) {
        const key = monthKey(new Date(row.dateSpotted));
        aiOverviewByMonth.set(key, (aiOverviewByMonth.get(key) || 0) + 1);
    }

    const aiOverviewGrowth = monthKeys
        .filter((key) => aiOverviewByMonth.has(key))
        .map((key) => ({
            month: key,
            label: monthLabel(key),
            count: aiOverviewByMonth.get(key) || 0,
        }));

    const topQueries = queryList.slice(0, 50);
    const topPages = pageList.slice(0, 50);

    return {
        generatedAt: new Date().toISOString(),
        period: {
            from: toIsoDate(dateRange.from),
            to: toIsoDate(dateRange.to),
            days,
        },
        compare: compare
            ? {
                from: toIsoDate(previousFrom),
                to: toIsoDate(previousTo),
            }
            : null,
        integration: {
            ...status,
            trafficSource,
            config,
        },
        searchConsole: {
            totals: currentTotals,
            previousTotals,
            chartDaily,
            topQueries,
            topPages,
            stateFilter: stateFilter ? { name: stateFilter.name, code: stateFilter.code } : null,
        },
        pagePerformance,
        brandedSearch: {
            totals: brandedTotals,
            daily: brandedDaily,
            patterns: BRANDED_QUERY_PATTERNS,
        },
        revenueCorrelation: {
            monthly: revenueCorrelation,
            topEnrollmentPages,
            topEnrollmentQueries,
        },
        contentPerformance: {
            rankedArticles,
            dueRefresh: rankedArticles.filter((row) => row.dueRefresh).slice(0, 50),
        },
        aiVisibility: {
            totalObservations: aiLogs.length,
            growth: aiOverviewGrowth,
            latest: aiLogs.slice(0, 50).map((row) => ({
                id: row.id,
                query: row.query,
                dateSpotted: row.dateSpotted.toISOString(),
                positionInOverview: row.positionInOverview,
                screenshotUrl: row.screenshotUrl,
                notes: row.notes,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            })),
        },
    };
}

export async function listAiOverviewObservations(options?: {
    q?: string | null;
    page?: number;
    pageSize?: number;
}) {
    const q = compactWhitespace(options?.q || "");
    const page = Math.max(1, Math.min(5000, Math.trunc(options?.page || 1)));
    const pageSize = Math.max(10, Math.min(250, Math.trunc(options?.pageSize || 100)));
    const skip = (page - 1) * pageSize;

    const where = q
        ? {
            OR: [
                { query: { contains: q, mode: "insensitive" as const } },
                { notes: { contains: q, mode: "insensitive" as const } },
                { screenshotUrl: { contains: q, mode: "insensitive" as const } },
            ],
        }
        : {};

    const [total, observations] = await prisma.$transaction([
        prisma.aiOverviewObservation.count({ where }),
        prisma.aiOverviewObservation.findMany({
            where,
            orderBy: [{ dateSpotted: "desc" }, { createdAt: "desc" }],
            skip,
            take: pageSize,
        }),
    ]);

    return {
        total,
        page,
        pageSize,
        observations,
    };
}

export async function createAiOverviewObservation(payload: Record<string, unknown>) {
    const query = normalizeOptionalString(payload.query, 500);
    if (!query) throw new Error("query is required");

    const dateSpotted = parseDate(payload.dateSpotted) || new Date();
    const positionInOverview =
        payload.positionInOverview === null || payload.positionInOverview === undefined || payload.positionInOverview === ""
            ? null
            : Math.max(1, Math.min(100, Math.trunc(Number(payload.positionInOverview))));

    return prisma.aiOverviewObservation.create({
        data: {
            query,
            dateSpotted,
            positionInOverview: Number.isFinite(positionInOverview as number) ? positionInOverview : null,
            screenshotUrl: normalizeOptionalString(payload.screenshotUrl, 2000),
            notes: normalizeOptionalString(payload.notes, 8000),
        },
    });
}

export async function updateAiOverviewObservation(id: string, payload: Record<string, unknown>) {
    const data: Record<string, unknown> = {};

    if (payload.query !== undefined) {
        const query = normalizeOptionalString(payload.query, 500);
        if (!query) throw new Error("query is required");
        data.query = query;
    }

    if (payload.dateSpotted !== undefined) {
        const date = payload.dateSpotted === null || payload.dateSpotted === "" ? null : parseDate(payload.dateSpotted);
        if (!date) throw new Error("dateSpotted is required");
        data.dateSpotted = date;
    }

    if (payload.positionInOverview !== undefined) {
        if (payload.positionInOverview === null || payload.positionInOverview === "") {
            data.positionInOverview = null;
        } else {
            const n = Number(payload.positionInOverview);
            if (!Number.isFinite(n)) throw new Error("positionInOverview must be a number");
            data.positionInOverview = Math.max(1, Math.min(100, Math.trunc(n)));
        }
    }

    if (payload.screenshotUrl !== undefined) {
        data.screenshotUrl = normalizeOptionalString(payload.screenshotUrl, 2000);
    }

    if (payload.notes !== undefined) {
        data.notes = normalizeOptionalString(payload.notes, 8000);
    }

    return prisma.aiOverviewObservation.update({
        where: { id },
        data,
    });
}

export async function deleteAiOverviewObservation(id: string) {
    return prisma.aiOverviewObservation.delete({ where: { id } });
}

export async function recordNativePageView(path: string) {
    const normalizedPath = normalizePagePath(path);

    if (!normalizedPath.startsWith("/") || normalizedPath.startsWith("/admin")) {
        return { skipped: true };
    }

    const metricDate = toUtcDay(new Date());

    await prisma.analyticsTrafficDaily.upsert({
        where: {
            metricDate_pagePath_source: {
                metricDate,
                pagePath: normalizedPath,
                source: "NATIVE",
            },
        },
        update: {
            pageViews: { increment: 1 },
        },
        create: {
            metricDate,
            pagePath: normalizedPath,
            source: "NATIVE",
            pageViews: 1,
            uniqueVisitors: 0,
            avgEngagementSec: null,
        },
    });

    return { skipped: false };
}

export function listStateFilterOptions() {
    return US_STATES.map((state) => ({
        name: state.name,
        code: state.code,
        slug: state.slug,
    }));
}

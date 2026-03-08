import tls from "tls";
import { google } from "googleapis";
import { subDays } from "date-fns";

import { prisma } from "@/lib/prisma";
import { absoluteUrl, getSiteOrigin } from "@/lib/site-url";
import { buildExpectedIndexablePaths, buildSitemapEntries } from "@/lib/sitemap";
import { sendAlert } from "@/lib/content-engine/alerts";
import { sendEmail } from "@/lib/email";

type ServiceAccount = {
    client_email: string;
    private_key: string;
};

export type SeoIssueSeverity = "CRITICAL" | "WARNING" | "INFO";

export type SeoIssue = {
    id: string;
    code: string;
    severity: SeoIssueSeverity;
    message: string;
    fix: string;
    pagePath?: string;
    url?: string;
    details?: Record<string, unknown>;
};

export type SeoPageDetail = {
    path: string;
    url: string;
    statusCode: number;
    loadMs: number;
    title: string;
    metaTitleLength: number;
    metaDescription: string;
    metaDescriptionLength: number;
    h1Count: number;
    schemaCount: number;
    ogMissing: string[];
    noindex: boolean;
    imagesWithoutAlt: number;
    internalLinks: string[];
    brokenInternalLinks: string[];
    issues: SeoIssue[];
    passedChecks: number;
    totalChecks: number;
};

export type SeoSiteCheck = {
    id: string;
    label: string;
    passed: boolean;
    severity: SeoIssueSeverity;
    message: string;
    details?: Record<string, unknown>;
};

export type SeoHealthReport = {
    status: "GREEN" | "YELLOW" | "RED";
    healthScore: number;
    indexRate: number;
    indexedCount: number;
    sampleCount: number;
    impressions: number;
    clicks: number;
    failedUrls: Array<{ url: string; reason: string }>;
    warnings: string[];
    window: { startDate: string; endDate: string };

    pagesAudited: number;
    sitemapUrlCount: number;
    indexedPagesCount: number | null;
    indexedPagesSource: string | null;

    passedChecks: number;
    totalChecks: number;

    issueCounts: {
        critical: number;
        warning: number;
        info: number;
        total: number;
    };

    siteChecks: SeoSiteCheck[];
    pageDetails: SeoPageDetail[];
    issues: SeoIssue[];
    trend: Array<{
        checkDate: string;
        healthScore: number;
        status: "GREEN" | "YELLOW" | "RED";
        criticalCount: number;
        warningCount: number;
        infoCount: number;
    }>;
};

export type SeoHealthConfig = {
    sampleSize: number;
    inspectionDays: number;
    trafficDays: number;
    autoRefreshHours: number;
    inspectionDailyLimit: number;
    inspectionConcurrency: number;
    stopPublishingOnRed: boolean;
    pauseDraftsOnRed: boolean;
    hardStopOnRed: boolean;

    auditConcurrency: number;
    requestTimeoutMs: number;
    warningPageLoadMs: number;
    criticalPageLoadMs: number;
    criticalAlertEmail: string;
};

export type SeoHealthSnapshot = {
    report: SeoHealthReport;
    updatedAt: string;
    cached: boolean;
    stale: boolean;
    config: SeoHealthConfig;
};

const CONFIG_KEY = "seoHealth:config";
const SNAPSHOT_KEY = "seoHealth:latest";
const SCHEDULE_KEY = "seoHealth:scheduleId";

const DEFAULT_CONFIG: SeoHealthConfig = {
    sampleSize: 50,
    inspectionDays: 7,
    trafficDays: 3,
    autoRefreshHours: 12,
    inspectionDailyLimit: Number(process.env.GSC_INSPECTION_DAILY_LIMIT || 2000),
    inspectionConcurrency: 5,
    stopPublishingOnRed: true,
    pauseDraftsOnRed: false,
    hardStopOnRed: true,

    auditConcurrency: 6,
    requestTimeoutMs: 10000,
    warningPageLoadMs: 2000,
    criticalPageLoadMs: 4000,
    criticalAlertEmail: String(process.env.SEO_HEALTH_ALERT_EMAIL || "").trim(),
};

const ISSUE_FIXES: Record<string, string> = {
    PAGE_UNREACHABLE: "Ensure the route returns HTTP 200 and is publicly reachable.",
    MISSING_META_TITLE: "Add a unique <title> tag for this page.",
    DUPLICATE_META_TITLE: "Rewrite the page title so it is unique across indexable pages.",
    META_TITLE_LENGTH: "Keep meta titles between 30 and 60 characters.",
    MISSING_META_DESCRIPTION: "Add a descriptive meta description.",
    DUPLICATE_META_DESCRIPTION: "Write a unique description for this page.",
    META_DESCRIPTION_LENGTH: "Keep meta descriptions between 70 and 160 characters.",
    MISSING_H1: "Add exactly one visible H1 heading.",
    MULTIPLE_H1: "Use a single H1 and move additional headings to H2/H3.",
    MISSING_SCHEMA: "Inject valid JSON-LD schema markup in the page head.",
    MISSING_OG_TAGS: "Add Open Graph tags: og:title, og:description, and og:type.",
    BROKEN_INTERNAL_LINK: "Update the href target or restore the destination page.",
    MISSING_IMAGE_ALT: "Provide meaningful alt text for content images.",
    UNEXPECTED_NOINDEX: "Remove noindex from indexable public pages.",
    MISSING_FROM_SITEMAP: "Ensure the URL is included in /sitemap.xml generation.",
    ROBOTS_TXT_INVALID: "Serve /robots.txt with User-agent, Disallow /admin, and Sitemap entries.",
    SITEMAP_INVALID: "Serve valid XML at /sitemap.xml with correct URL entries.",
    SSL_INVALID: "Fix TLS certificate validity and hostname chain.",
    PAGE_LOAD_SLOW: "Optimize page response time and reduce server/render overhead.",
    GSC_INDEXED_COUNT_UNAVAILABLE: "Connect Search Console service account and verify site property access.",
};

function normalizeConfig(input?: Partial<SeoHealthConfig>): SeoHealthConfig {
    const next = { ...DEFAULT_CONFIG, ...(input || {}) };

    const toNumber = (value: unknown, fallback: number) => {
        const n = typeof value === "number" ? value : Number(value);
        return Number.isFinite(n) ? n : fallback;
    };

    return {
        sampleSize: Math.max(1, Math.min(200, toNumber(next.sampleSize, DEFAULT_CONFIG.sampleSize))),
        inspectionDays: Math.max(1, Math.min(30, toNumber(next.inspectionDays, DEFAULT_CONFIG.inspectionDays))),
        trafficDays: Math.max(1, Math.min(30, toNumber(next.trafficDays, DEFAULT_CONFIG.trafficDays))),
        autoRefreshHours: Math.max(1, Math.min(72, toNumber(next.autoRefreshHours, DEFAULT_CONFIG.autoRefreshHours))),
        inspectionDailyLimit: Math.max(1, toNumber(next.inspectionDailyLimit, DEFAULT_CONFIG.inspectionDailyLimit)),
        inspectionConcurrency: Math.max(1, Math.min(10, toNumber(next.inspectionConcurrency, DEFAULT_CONFIG.inspectionConcurrency))),
        stopPublishingOnRed: Boolean(next.stopPublishingOnRed),
        pauseDraftsOnRed: Boolean(next.pauseDraftsOnRed),
        hardStopOnRed: Boolean(next.hardStopOnRed),

        auditConcurrency: Math.max(1, Math.min(20, toNumber(next.auditConcurrency, DEFAULT_CONFIG.auditConcurrency))),
        requestTimeoutMs: Math.max(1000, Math.min(30000, toNumber(next.requestTimeoutMs, DEFAULT_CONFIG.requestTimeoutMs))),
        warningPageLoadMs: Math.max(200, Math.min(15000, toNumber(next.warningPageLoadMs, DEFAULT_CONFIG.warningPageLoadMs))),
        criticalPageLoadMs: Math.max(500, Math.min(30000, toNumber(next.criticalPageLoadMs, DEFAULT_CONFIG.criticalPageLoadMs))),
        criticalAlertEmail: String(next.criticalAlertEmail || "").trim().slice(0, 320),
    };
}

function normalizePath(path: string) {
    const raw = String(path || "").split("#")[0].trim();
    if (!raw) return "/";
    let next = raw.startsWith("/") ? raw : `/${raw}`;
    if (next.length > 1 && next.endsWith("/")) next = next.slice(0, -1);
    return next;
}

function getIssueFix(code: string) {
    return ISSUE_FIXES[code] || "Review the page and align markup/content with SEO requirements.";
}

function issueId() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function buildIssue(input: {
    code: string;
    severity: SeoIssueSeverity;
    message: string;
    pagePath?: string;
    url?: string;
    details?: Record<string, unknown>;
}): SeoIssue {
    return {
        id: issueId(),
        code: input.code,
        severity: input.severity,
        message: input.message,
        fix: getIssueFix(input.code),
        pagePath: input.pagePath,
        url: input.url,
        details: input.details,
    };
}

function severitySortValue(severity: SeoIssueSeverity) {
    if (severity === "CRITICAL") return 0;
    if (severity === "WARNING") return 1;
    return 2;
}

function hasGscCredentials() {
    return Boolean(
        process.env.GSC_SERVICE_ACCOUNT_JSON ||
        process.env.GSC_SERVICE_ACCOUNT_KEY ||
        process.env.GSC_SERVICE_ACCOUNT_BASE64 ||
        process.env.GSC_SERVICE_ACCOUNT_PATH
    );
}

function getServiceAccount(): ServiceAccount {
    const raw =
        process.env.GSC_SERVICE_ACCOUNT_JSON ||
        process.env.GSC_SERVICE_ACCOUNT_KEY ||
        (process.env.GSC_SERVICE_ACCOUNT_BASE64
            ? Buffer.from(process.env.GSC_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8")
            : undefined);

    if (raw) {
        const parsed = JSON.parse(raw);
        return { client_email: parsed.client_email, private_key: parsed.private_key };
    }

    const path = process.env.GSC_SERVICE_ACCOUNT_PATH;
    if (path) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require("fs");
        const parsed = JSON.parse(fs.readFileSync(path, "utf8"));
        return { client_email: parsed.client_email, private_key: parsed.private_key };
    }

    throw new Error("Missing GSC service account JSON. Set GSC_SERVICE_ACCOUNT_JSON or GSC_SERVICE_ACCOUNT_PATH.");
}

function getSiteUrl(): string {
    const siteUrl = process.env.GSC_SITE_URL || process.env.NEXTAUTH_URL || process.env.SITE_URL;
    if (!siteUrl) throw new Error("Missing GSC_SITE_URL (or NEXTAUTH_URL/SITE_URL fallback).");
    return siteUrl;
}

function buildAuth() {
    const { client_email, private_key } = getServiceAccount();
    return new google.auth.JWT({
        email: client_email,
        key: private_key,
        scopes: [
            "https://www.googleapis.com/auth/webmasters",
            "https://www.googleapis.com/auth/webmasters.readonly",
        ],
    });
}

function buildDateRange(days: number) {
    const endDate = subDays(new Date(), 1);
    const startDate = subDays(endDate, days - 1);
    const format = (d: Date) => d.toISOString().slice(0, 10);
    return { startDate: format(startDate), endDate: format(endDate) };
}

async function fetchTrafficTotals(days: number) {
    const auth = buildAuth();
    const searchconsole = google.searchconsole({ version: "v1", auth });
    const siteUrl = getSiteUrl();
    const window = buildDateRange(days);

    const response = await searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
            startDate: window.startDate,
            endDate: window.endDate,
            rowLimit: 250,
        },
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

async function fetchIndexedPagesCountFromGsc() {
    const auth = buildAuth();
    const searchconsole = google.searchconsole({ version: "v1", auth });
    const siteUrl = getSiteUrl();

    const response = await searchconsole.sitemaps.get({
        siteUrl,
        feedpath: absoluteUrl("/sitemap.xml"),
    });

    const contents = Array.isArray(response.data?.contents) ? response.data.contents : [];
    const first = contents[0];
    const indexed = Number(first?.indexed || 0);
    const submitted = Number(first?.submitted || 0);

    return {
        indexed: Number.isFinite(indexed) ? indexed : null,
        submitted: Number.isFinite(submitted) ? submitted : null,
        source: "google_search_console_sitemaps_api",
    };
}

function parseAttributes(tag: string) {
    const attrs: Record<string, string> = {};
    const re = /([:@a-zA-Z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
    for (const match of tag.matchAll(re)) {
        const key = String(match[1] || "").toLowerCase();
        const value = String(match[2] ?? match[3] ?? match[4] ?? "").trim();
        if (key) attrs[key] = value;
    }
    return attrs;
}

function compactWhitespace(value: unknown) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
}

function extractTitle(html: string) {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return compactWhitespace(match?.[1] || "");
}

function parseMetaTags(html: string) {
    const tags = html.match(/<meta\b[^>]*>/gi) || [];
    return tags.map((tag) => parseAttributes(tag));
}

function extractMetaContent(metaTags: Array<Record<string, string>>, key: string) {
    const lowerKey = key.toLowerCase();
    for (const attrs of metaTags) {
        const name = String(attrs.name || "").toLowerCase();
        const property = String(attrs.property || "").toLowerCase();
        if (name === lowerKey || property === lowerKey) {
            return compactWhitespace(attrs.content || "");
        }
    }
    return "";
}

function extractH1Count(html: string) {
    const matches = html.match(/<h1\b/gi);
    return matches ? matches.length : 0;
}

function extractSchemaCount(html: string) {
    const matches = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>/gi);
    return matches ? matches.length : 0;
}

function extractNoindex(metaTags: Array<Record<string, string>>) {
    for (const attrs of metaTags) {
        const name = String(attrs.name || "").toLowerCase();
        if (name !== "robots" && name !== "googlebot") continue;
        const content = String(attrs.content || "").toLowerCase();
        if (content.includes("noindex")) return true;
    }
    return false;
}

function extractMissingOgTags(metaTags: Array<Record<string, string>>) {
    const required = ["og:title", "og:description", "og:type"];
    const present = new Set<string>();
    for (const attrs of metaTags) {
        const property = String(attrs.property || "").toLowerCase();
        if (!property) continue;
        if (!String(attrs.content || "").trim()) continue;
        present.add(property);
    }
    return required.filter((key) => !present.has(key));
}

function extractImagesWithoutAlt(html: string) {
    const imgTags = html.match(/<img\b[^>]*>/gi) || [];
    let missing = 0;
    for (const tag of imgTags) {
        const attrs = parseAttributes(tag);
        const alt = compactWhitespace(attrs.alt || "");
        if (!alt) missing += 1;
    }
    return missing;
}

function extractInternalLinks(html: string, pageUrl: string, siteOrigin: string) {
    const links = new Set<string>();
    const re = /<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;

    for (const match of html.matchAll(re)) {
        const href = String(match[1] ?? match[2] ?? match[3] ?? "").trim();
        if (!href) continue;
        const lower = href.toLowerCase();
        if (
            href.startsWith("#") ||
            lower.startsWith("mailto:") ||
            lower.startsWith("tel:") ||
            lower.startsWith("javascript:")
        ) {
            continue;
        }

        try {
            const resolved = new URL(href, pageUrl);
            if (resolved.origin !== siteOrigin) continue;
            const path = normalizePath(resolved.pathname);
            if (!path || path.startsWith("/admin") || path.startsWith("/api")) continue;
            links.add(path);
        } catch {
            continue;
        }
    }

    return [...links].sort();
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

async function fetchWithTiming(url: string, timeoutMs: number, method: "GET" | "HEAD" = "GET") {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    try {
        const response = await fetch(url, {
            method,
            redirect: "follow",
            cache: "no-store",
            signal: controller.signal,
            headers: {
                "user-agent": "PresentHealthSeoMonitor/1.0",
                accept: "text/html,application/xml,text/plain,*/*",
            },
        });
        const loadMs = Date.now() - started;
        return { ok: response.ok, status: response.status, response, loadMs, error: null as string | null };
    } catch (error: any) {
        const loadMs = Date.now() - started;
        return {
            ok: false,
            status: 0,
            response: null as Response | null,
            loadMs,
            error: String(error?.message || "Request failed"),
        };
    } finally {
        clearTimeout(timeout);
    }
}

function pushCheck(detail: SeoPageDetail, passed: boolean) {
    detail.totalChecks += 1;
    if (passed) detail.passedChecks += 1;
}

function addIssue(detail: SeoPageDetail, issue: SeoIssue) {
    detail.issues.push(issue);
}

async function auditSinglePage(path: string, config: SeoHealthConfig, siteOrigin: string): Promise<SeoPageDetail> {
    const url = absoluteUrl(path);
    const request = await fetchWithTiming(url, config.requestTimeoutMs, "GET");

    const detail: SeoPageDetail = {
        path,
        url,
        statusCode: request.status,
        loadMs: request.loadMs,
        title: "",
        metaTitleLength: 0,
        metaDescription: "",
        metaDescriptionLength: 0,
        h1Count: 0,
        schemaCount: 0,
        ogMissing: [],
        noindex: false,
        imagesWithoutAlt: 0,
        internalLinks: [],
        brokenInternalLinks: [],
        issues: [],
        passedChecks: 0,
        totalChecks: 0,
    };

    const reachable = request.status >= 200 && request.status < 400;
    pushCheck(detail, reachable);
    if (!reachable) {
        addIssue(
            detail,
            buildIssue({
                code: "PAGE_UNREACHABLE",
                severity: "CRITICAL",
                message: `Page returned HTTP ${request.status || 0}${request.error ? ` (${request.error})` : ""}.`,
                pagePath: path,
                url,
            })
        );
    }

    let html = "";
    if (request.response && reachable) {
        const contentType = String(request.response.headers.get("content-type") || "").toLowerCase();
        if (contentType.includes("text/html") || contentType.includes("application/xhtml")) {
            html = await request.response.text();
        }
    }

    const metaTags = html ? parseMetaTags(html) : [];
    detail.title = extractTitle(html);
    detail.metaTitleLength = detail.title.length;
    detail.metaDescription = extractMetaContent(metaTags, "description");
    detail.metaDescriptionLength = detail.metaDescription.length;
    detail.h1Count = extractH1Count(html);
    detail.schemaCount = extractSchemaCount(html);
    detail.ogMissing = extractMissingOgTags(metaTags);
    detail.noindex = extractNoindex(metaTags);
    detail.imagesWithoutAlt = extractImagesWithoutAlt(html);
    detail.internalLinks = extractInternalLinks(html, url, siteOrigin);

    const hasMetaTitle = detail.title.length > 0;
    pushCheck(detail, hasMetaTitle);
    if (!hasMetaTitle) {
        addIssue(
            detail,
            buildIssue({
                code: "MISSING_META_TITLE",
                severity: "CRITICAL",
                message: "Meta title is missing.",
                pagePath: path,
                url,
            })
        );
    }

    const validMetaTitleLength = !hasMetaTitle ? false : detail.metaTitleLength >= 30 && detail.metaTitleLength <= 60;
    pushCheck(detail, validMetaTitleLength);
    if (hasMetaTitle && !validMetaTitleLength) {
        addIssue(
            detail,
            buildIssue({
                code: "META_TITLE_LENGTH",
                severity: "WARNING",
                message: `Meta title length is ${detail.metaTitleLength} characters (recommended 30-60).`,
                pagePath: path,
                url,
                details: { length: detail.metaTitleLength },
            })
        );
    }

    const hasMetaDescription = detail.metaDescription.length > 0;
    pushCheck(detail, hasMetaDescription);
    if (!hasMetaDescription) {
        addIssue(
            detail,
            buildIssue({
                code: "MISSING_META_DESCRIPTION",
                severity: "CRITICAL",
                message: "Meta description is missing.",
                pagePath: path,
                url,
            })
        );
    }

    const validMetaDescriptionLength =
        !hasMetaDescription ? false : detail.metaDescriptionLength >= 70 && detail.metaDescriptionLength <= 160;
    pushCheck(detail, validMetaDescriptionLength);
    if (hasMetaDescription && !validMetaDescriptionLength) {
        addIssue(
            detail,
            buildIssue({
                code: "META_DESCRIPTION_LENGTH",
                severity: "WARNING",
                message: `Meta description length is ${detail.metaDescriptionLength} characters (recommended 70-160).`,
                pagePath: path,
                url,
                details: { length: detail.metaDescriptionLength },
            })
        );
    }

    const hasSingleH1 = detail.h1Count === 1;
    pushCheck(detail, hasSingleH1);
    if (detail.h1Count === 0) {
        addIssue(
            detail,
            buildIssue({
                code: "MISSING_H1",
                severity: "CRITICAL",
                message: "Missing H1 heading.",
                pagePath: path,
                url,
            })
        );
    } else if (detail.h1Count > 1) {
        addIssue(
            detail,
            buildIssue({
                code: "MULTIPLE_H1",
                severity: "WARNING",
                message: `Found ${detail.h1Count} H1 tags.`,
                pagePath: path,
                url,
                details: { h1Count: detail.h1Count },
            })
        );
    }

    const hasSchema = detail.schemaCount > 0;
    pushCheck(detail, hasSchema);
    if (!hasSchema) {
        addIssue(
            detail,
            buildIssue({
                code: "MISSING_SCHEMA",
                severity: "WARNING",
                message: "No JSON-LD schema block detected.",
                pagePath: path,
                url,
            })
        );
    }

    const hasOg = detail.ogMissing.length === 0;
    pushCheck(detail, hasOg);
    if (!hasOg) {
        addIssue(
            detail,
            buildIssue({
                code: "MISSING_OG_TAGS",
                severity: "WARNING",
                message: `Missing Open Graph tags: ${detail.ogMissing.join(", ")}.`,
                pagePath: path,
                url,
                details: { missing: detail.ogMissing },
            })
        );
    }

    const hasAltText = detail.imagesWithoutAlt === 0;
    pushCheck(detail, hasAltText);
    if (!hasAltText) {
        addIssue(
            detail,
            buildIssue({
                code: "MISSING_IMAGE_ALT",
                severity: "WARNING",
                message: `${detail.imagesWithoutAlt} image(s) missing alt text.`,
                pagePath: path,
                url,
                details: { imagesWithoutAlt: detail.imagesWithoutAlt },
            })
        );
    }

    const indexable = !detail.noindex;
    pushCheck(detail, indexable);
    if (!indexable) {
        addIssue(
            detail,
            buildIssue({
                code: "UNEXPECTED_NOINDEX",
                severity: "CRITICAL",
                message: "Page has noindex but is expected to be indexable.",
                pagePath: path,
                url,
            })
        );
    }

    return detail;
}

function dedupeText(value: string) {
    return compactWhitespace(value).toLowerCase();
}

async function checkInternalTarget(path: string, config: SeoHealthConfig) {
    const url = absoluteUrl(path);
    let req = await fetchWithTiming(url, config.requestTimeoutMs, "HEAD");
    if (req.status === 405 || req.status === 501 || req.status === 0) {
        req = await fetchWithTiming(url, config.requestTimeoutMs, "GET");
    }
    return {
        path,
        url,
        ok: req.status >= 200 && req.status < 400,
        status: req.status,
        loadMs: req.loadMs,
        error: req.error,
    };
}

async function checkSslCertificate(origin: string) {
    try {
        const parsed = new URL(origin);
        if (parsed.protocol !== "https:") {
            return {
                passed: false,
                message: "Site origin is not HTTPS.",
                details: { protocol: parsed.protocol },
            };
        }

        const host = parsed.hostname;
        const port = parsed.port ? Number(parsed.port) : 443;

        const certificate = await new Promise<tls.PeerCertificate>((resolve, reject) => {
            const socket = tls.connect(
                {
                    host,
                    port,
                    servername: host,
                    rejectUnauthorized: false,
                },
                () => {
                    const cert = socket.getPeerCertificate();
                    socket.end();
                    if (!cert || !cert.valid_to) {
                        reject(new Error("Unable to read peer certificate"));
                        return;
                    }
                    resolve(cert);
                }
            );

            socket.setTimeout(8000, () => {
                socket.destroy(new Error("TLS timeout"));
            });

            socket.on("error", (error) => {
                reject(error);
            });
        });

        const validTo = new Date(certificate.valid_to);
        const validFrom = new Date(certificate.valid_from);
        const now = new Date();

        const passed = validTo.getTime() > now.getTime() && validFrom.getTime() <= now.getTime();
        return {
            passed,
            message: passed
                ? `SSL certificate valid until ${validTo.toISOString().slice(0, 10)}.`
                : `SSL certificate is invalid (valid_from=${certificate.valid_from}, valid_to=${certificate.valid_to}).`,
            details: {
                validFrom: certificate.valid_from,
                validTo: certificate.valid_to,
                subject: certificate.subject,
                issuer: certificate.issuer,
            },
        };
    } catch (error: any) {
        return {
            passed: false,
            message: `SSL check failed: ${String(error?.message || error)}`,
            details: { error: String(error?.message || error) },
        };
    }
}

function parseSitemapPaths(xml: string, siteOrigin: string) {
    const paths: string[] = [];
    const locMatches = xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi);
    for (const match of locMatches) {
        const raw = compactWhitespace(match[1] || "");
        if (!raw) continue;
        try {
            const url = new URL(raw);
            if (url.origin !== siteOrigin) continue;
            paths.push(normalizePath(url.pathname));
        } catch {
            continue;
        }
    }
    return [...new Set(paths)].sort();
}

function addSiteCheck(
    checks: SeoSiteCheck[],
    issues: SeoIssue[],
    options: {
        id: string;
        label: string;
        passed: boolean;
        severity: SeoIssueSeverity;
        message: string;
        details?: Record<string, unknown>;
        issueCode?: string;
    }
) {
    checks.push({
        id: options.id,
        label: options.label,
        passed: options.passed,
        severity: options.severity,
        message: options.message,
        details: options.details,
    });

    if (!options.passed && options.issueCode) {
        issues.push(
            buildIssue({
                code: options.issueCode,
                severity: options.severity,
                message: options.message,
                details: options.details,
            })
        );
    }
}

async function getSeoHealthHistory(limit = 30) {
    try {
        const rows = await prisma.seoHealthCheck.findMany({
            orderBy: { checkDate: "desc" },
            take: Math.max(1, Math.min(120, limit)),
            select: {
                checkDate: true,
                healthScore: true,
                criticalCount: true,
                warningCount: true,
                infoCount: true,
                status: true,
            },
        });

        return rows
            .map((row) => ({
                checkDate: row.checkDate.toISOString(),
                healthScore: row.healthScore,
                status: row.status as "GREEN" | "YELLOW" | "RED",
                criticalCount: row.criticalCount,
                warningCount: row.warningCount,
                infoCount: row.infoCount,
            }))
            .reverse();
    } catch {
        return [];
    }
}

async function computeSeoHealthReport(config: SeoHealthConfig): Promise<SeoHealthReport> {
    const siteOrigin = getSiteOrigin();
    const [sitemapEntries, expectedPaths] = await Promise.all([buildSitemapEntries(), buildExpectedIndexablePaths()]);
    const expectedPathSet = new Set(expectedPaths.map((path) => normalizePath(path)));

    const pageDetails = await mapWithConcurrency(
        sitemapEntries.map((entry) => normalizePath(entry.path)),
        config.auditConcurrency,
        async (path) => auditSinglePage(path, config, siteOrigin)
    );

    const pageMap = new Map(pageDetails.map((detail) => [detail.path, detail]));

    const allIssues: SeoIssue[] = [];
    for (const page of pageDetails) {
        allIssues.push(...page.issues);
    }

    const titleIndex = new Map<string, string[]>();
    const descriptionIndex = new Map<string, string[]>();

    for (const page of pageDetails) {
        const titleKey = dedupeText(page.title);
        if (titleKey) {
            titleIndex.set(titleKey, [...(titleIndex.get(titleKey) || []), page.path]);
        }

        const descriptionKey = dedupeText(page.metaDescription);
        if (descriptionKey) {
            descriptionIndex.set(descriptionKey, [...(descriptionIndex.get(descriptionKey) || []), page.path]);
        }
    }

    for (const paths of titleIndex.values()) {
        const unique = [...new Set(paths)];
        for (const path of unique) {
            const page = pageMap.get(path);
            if (!page) continue;
            page.totalChecks += 1;
            if (unique.length === 1) {
                page.passedChecks += 1;
            } else {
                const issue = buildIssue({
                    code: "DUPLICATE_META_TITLE",
                    severity: "WARNING",
                    message: `Meta title duplicates ${unique.length - 1} other page(s).`,
                    pagePath: path,
                    url: page.url,
                    details: { duplicatePaths: unique.filter((x) => x !== path) },
                });
                page.issues.push(issue);
                allIssues.push(issue);
            }
        }
    }

    for (const paths of descriptionIndex.values()) {
        const unique = [...new Set(paths)];
        for (const path of unique) {
            const page = pageMap.get(path);
            if (!page) continue;
            page.totalChecks += 1;
            if (unique.length === 1) {
                page.passedChecks += 1;
            } else {
                const issue = buildIssue({
                    code: "DUPLICATE_META_DESCRIPTION",
                    severity: "WARNING",
                    message: `Meta description duplicates ${unique.length - 1} other page(s).`,
                    pagePath: path,
                    url: page.url,
                    details: { duplicatePaths: unique.filter((x) => x !== path) },
                });
                page.issues.push(issue);
                allIssues.push(issue);
            }
        }
    }

    const uniqueInternalTargets = [...new Set(pageDetails.flatMap((page) => page.internalLinks))].sort();
    const linkChecks = await mapWithConcurrency(uniqueInternalTargets, config.auditConcurrency, (path) =>
        checkInternalTarget(path, config)
    );
    const linkCheckMap = new Map(linkChecks.map((check) => [normalizePath(check.path), check]));

    for (const page of pageDetails) {
        page.totalChecks += 1;
        const broken = page.internalLinks.filter((target) => {
            const result = linkCheckMap.get(normalizePath(target));
            return !result || !result.ok;
        });
        page.brokenInternalLinks = broken;
        if (broken.length === 0) {
            page.passedChecks += 1;
        } else {
            const issue = buildIssue({
                code: "BROKEN_INTERNAL_LINK",
                severity: "WARNING",
                message: `${broken.length} broken internal link(s) found.`,
                pagePath: page.path,
                url: page.url,
                details: { brokenTargets: broken.slice(0, 20) },
            });
            page.issues.push(issue);
            allIssues.push(issue);
        }
    }

    const siteChecks: SeoSiteCheck[] = [];
    const siteIssues: SeoIssue[] = [];

    const robotsReq = await fetchWithTiming(absoluteUrl("/robots.txt"), config.requestTimeoutMs, "GET");
    const robotsText = robotsReq.response ? await robotsReq.response.text() : "";
    const robotsValid =
        robotsReq.status === 200 &&
        /user-agent:\s*\*/i.test(robotsText) &&
        /disallow:\s*\/admin/i.test(robotsText) &&
        /sitemap:\s*https?:\/\//i.test(robotsText);

    addSiteCheck(siteChecks, siteIssues, {
        id: "robots_txt",
        label: "robots.txt accessible and correct",
        passed: robotsValid,
        severity: "CRITICAL",
        message: robotsValid
            ? "robots.txt is accessible and includes sitemap + admin disallow rules."
            : `robots.txt failed validation (status ${robotsReq.status || 0}).`,
        issueCode: "ROBOTS_TXT_INVALID",
        details: { status: robotsReq.status },
    });

    const sitemapReq = await fetchWithTiming(absoluteUrl("/sitemap.xml"), config.requestTimeoutMs, "GET");
    const sitemapXml = sitemapReq.response ? await sitemapReq.response.text() : "";
    const sitemapValid =
        sitemapReq.status === 200 &&
        /^\s*<\?xml/i.test(sitemapXml) &&
        /<urlset\b/i.test(sitemapXml) &&
        /<loc>/i.test(sitemapXml);

    addSiteCheck(siteChecks, siteIssues, {
        id: "sitemap_xml",
        label: "sitemap.xml accessible and valid",
        passed: sitemapValid,
        severity: "CRITICAL",
        message: sitemapValid
            ? "sitemap.xml is accessible and valid XML."
            : `sitemap.xml failed validation (status ${sitemapReq.status || 0}).`,
        issueCode: "SITEMAP_INVALID",
        details: { status: sitemapReq.status },
    });

    const sitemapPaths = sitemapValid ? parseSitemapPaths(sitemapXml, siteOrigin) : [];
    const sitemapPathSet = new Set(sitemapPaths.map((path) => normalizePath(path)));
    const missingFromSitemap = [...expectedPathSet].filter((path) => !sitemapPathSet.has(path));

    addSiteCheck(siteChecks, siteIssues, {
        id: "sitemap_completeness",
        label: "Expected pages are in sitemap",
        passed: missingFromSitemap.length === 0,
        severity: missingFromSitemap.length > 0 ? "CRITICAL" : "INFO",
        message:
            missingFromSitemap.length === 0
                ? "All expected indexable URLs are present in sitemap."
                : `${missingFromSitemap.length} expected URL(s) missing from sitemap.xml.`,
        details: { missingPaths: missingFromSitemap.slice(0, 50) },
        issueCode: "MISSING_FROM_SITEMAP",
    });

    for (const path of missingFromSitemap) {
        const issue = buildIssue({
            code: "MISSING_FROM_SITEMAP",
            severity: "CRITICAL",
            message: "Expected indexable page is missing from sitemap.xml.",
            pagePath: path,
            url: absoluteUrl(path),
        });
        allIssues.push(issue);
    }

    const ssl = await checkSslCertificate(siteOrigin);
    addSiteCheck(siteChecks, siteIssues, {
        id: "ssl_certificate",
        label: "SSL certificate valid",
        passed: ssl.passed,
        severity: "CRITICAL",
        message: ssl.message,
        details: ssl.details,
        issueCode: "SSL_INVALID",
    });

    const keyPaths = ["/", "/pricing", "/how-it-works", "/states", "/learn", "/for-employers"];
    const keyPageLoads = await mapWithConcurrency(keyPaths, Math.min(4, config.auditConcurrency), async (path) => {
        const req = await fetchWithTiming(absoluteUrl(path), config.requestTimeoutMs, "GET");
        return {
            path,
            statusCode: req.status,
            loadMs: req.loadMs,
            ok: req.status >= 200 && req.status < 400,
        };
    });

    const slowCritical = keyPageLoads.filter((item) => item.ok && item.loadMs > config.criticalPageLoadMs);
    const slowWarning = keyPageLoads.filter(
        (item) => item.ok && item.loadMs > config.warningPageLoadMs && item.loadMs <= config.criticalPageLoadMs
    );
    const keyPageFailures = keyPageLoads.filter((item) => !item.ok);

    addSiteCheck(siteChecks, siteIssues, {
        id: "key_page_load",
        label: "Key page load times",
        passed: slowCritical.length === 0 && keyPageFailures.length === 0,
        severity: slowCritical.length > 0 || keyPageFailures.length > 0 ? "CRITICAL" : slowWarning.length > 0 ? "WARNING" : "INFO",
        message:
            keyPageFailures.length > 0
                ? `${keyPageFailures.length} key page(s) failed to load.`
                : slowCritical.length > 0
                    ? `${slowCritical.length} key page(s) exceeded critical threshold (${config.criticalPageLoadMs}ms).`
                    : slowWarning.length > 0
                        ? `${slowWarning.length} key page(s) exceeded warning threshold (${config.warningPageLoadMs}ms).`
                        : "Key page load times are within threshold.",
        details: {
            warningThresholdMs: config.warningPageLoadMs,
            criticalThresholdMs: config.criticalPageLoadMs,
            keyPages: keyPageLoads,
        },
        issueCode: slowCritical.length > 0 || keyPageFailures.length > 0 ? "PAGE_LOAD_SLOW" : undefined,
    });

    let indexedPagesCount: number | null = null;
    let indexedPagesSource: string | null = null;

    if (hasGscCredentials()) {
        try {
            const indexed = await fetchIndexedPagesCountFromGsc();
            indexedPagesCount = indexed.indexed;
            indexedPagesSource = indexed.source;

            addSiteCheck(siteChecks, siteIssues, {
                id: "gsc_indexed_pages",
                label: "Search Console indexed pages",
                passed: indexedPagesCount !== null,
                severity: indexedPagesCount !== null ? "INFO" : "WARNING",
                message:
                    indexedPagesCount !== null
                        ? `Search Console reports ${indexedPagesCount} indexed page(s).`
                        : "Search Console did not return indexed page count.",
                details: indexed,
                issueCode: indexedPagesCount !== null ? undefined : "GSC_INDEXED_COUNT_UNAVAILABLE",
            });
        } catch (error: any) {
            addSiteCheck(siteChecks, siteIssues, {
                id: "gsc_indexed_pages",
                label: "Search Console indexed pages",
                passed: false,
                severity: "WARNING",
                message: `Search Console indexed-page check failed: ${String(error?.message || error)}`,
                issueCode: "GSC_INDEXED_COUNT_UNAVAILABLE",
            });
        }
    } else {
        addSiteCheck(siteChecks, siteIssues, {
            id: "gsc_indexed_pages",
            label: "Search Console indexed pages",
            passed: true,
            severity: "INFO",
            message: "Search Console credentials are not configured; indexed-page count check skipped.",
        });
    }

    let impressions = 0;
    let clicks = 0;
    let window = buildDateRange(config.trafficDays);
    try {
        if (hasGscCredentials()) {
            const traffic = await fetchTrafficTotals(config.trafficDays);
            impressions = traffic.impressions;
            clicks = traffic.clicks;
            window = traffic.window;
        }
    } catch (error) {
        // Keep traffic metrics optional.
    }

    const allSiteIssues = [...siteIssues];
    allIssues.push(...allSiteIssues);

    const issueCounts = allIssues.reduce(
        (acc, issue) => {
            if (issue.severity === "CRITICAL") acc.critical += 1;
            else if (issue.severity === "WARNING") acc.warning += 1;
            else acc.info += 1;
            return acc;
        },
        { critical: 0, warning: 0, info: 0 }
    );

    const pageCheckCounts = pageDetails.reduce(
        (acc, page) => {
            acc.total += page.totalChecks;
            acc.passed += page.passedChecks;
            return acc;
        },
        { total: 0, passed: 0 }
    );

    const siteCheckCounts = siteChecks.reduce(
        (acc, check) => {
            acc.total += 1;
            if (check.passed) acc.passed += 1;
            return acc;
        },
        { total: 0, passed: 0 }
    );

    const totalChecks = pageCheckCounts.total + siteCheckCounts.total;
    const passedChecks = pageCheckCounts.passed + siteCheckCounts.passed;
    const healthScore = totalChecks > 0 ? Math.max(0, Math.min(100, Math.round((passedChecks / totalChecks) * 100))) : 0;

    const status: "GREEN" | "YELLOW" | "RED" =
        issueCounts.critical > 0 || healthScore < 70
            ? "RED"
            : issueCounts.warning > 0 || healthScore < 90
                ? "YELLOW"
                : "GREEN";

    const sitemapUrlCount = expectedPathSet.size;
    const indexRate =
        indexedPagesCount !== null && sitemapUrlCount > 0
            ? Number(((indexedPagesCount / sitemapUrlCount) * 100).toFixed(1))
            : Number(healthScore.toFixed(1));

    const failedUrls = allIssues
        .filter((issue) => issue.severity === "CRITICAL")
        .slice(0, 120)
        .map((issue) => ({
            url: issue.url || (issue.pagePath ? absoluteUrl(issue.pagePath) : absoluteUrl("/")),
            reason: issue.message,
        }));

    const warnings = allIssues
        .filter((issue) => issue.severity !== "INFO")
        .map((issue) => `${issue.code}: ${issue.message}`)
        .slice(0, 60);

    const trend = await getSeoHealthHistory(30);

    return {
        status,
        healthScore,
        indexRate,
        indexedCount: indexedPagesCount ?? pageDetails.filter((page) => page.statusCode >= 200 && page.statusCode < 400).length,
        sampleCount: sitemapUrlCount,
        impressions,
        clicks,
        failedUrls,
        warnings,
        window,

        pagesAudited: pageDetails.length,
        sitemapUrlCount,
        indexedPagesCount,
        indexedPagesSource,

        passedChecks,
        totalChecks,

        issueCounts: {
            ...issueCounts,
            total: issueCounts.critical + issueCounts.warning + issueCounts.info,
        },

        siteChecks,
        pageDetails: pageDetails
            .map((page) => ({
                ...page,
                issues: [...page.issues].sort((a, b) => {
                    const s = severitySortValue(a.severity) - severitySortValue(b.severity);
                    if (s !== 0) return s;
                    return a.code.localeCompare(b.code);
                }),
            }))
            .sort((a, b) => a.path.localeCompare(b.path)),
        issues: [...allIssues].sort((a, b) => {
            const s = severitySortValue(a.severity) - severitySortValue(b.severity);
            if (s !== 0) return s;
            const pathA = a.pagePath || "";
            const pathB = b.pagePath || "";
            if (pathA !== pathB) return pathA.localeCompare(pathB);
            return a.code.localeCompare(b.code);
        }),
        trend,
    };
}

async function ensureSeoHealthSchedule() {
    try {
        const stored = await prisma.contentStrategy.findUnique({ where: { key: SCHEDULE_KEY } });
        const scheduleId = stored?.value && typeof stored.value === "object" ? (stored.value as any).id : null;
        if (scheduleId) {
            const existing = await prisma.contentSchedule.findUnique({ where: { id: scheduleId } });
            if (existing) return existing;
        }

        const schedule = await prisma.contentSchedule.create({
            data: {
                name: "SEO Health Snapshot",
                enabled: true,
                timezone: process.env.SEO_HEALTH_TIMEZONE || "America/Chicago",
                cadence: "DAILY",
                runHour: Number(process.env.SEO_HEALTH_RUN_HOUR || 3),
                runMinute: Number(process.env.SEO_HEALTH_RUN_MINUTE || 15),
                maxDaily: null,
                options: {
                    jobType: "SEO_HEALTH",
                },
            },
        });

        await prisma.contentStrategy.upsert({
            where: { key: SCHEDULE_KEY },
            update: { value: { id: schedule.id } as any },
            create: { key: SCHEDULE_KEY, value: { id: schedule.id } as any },
        });

        return schedule;
    } catch (error) {
        console.warn("Failed to ensure SEO health schedule.", error);
        return null;
    }
}

async function logSeoHealthAudit(action: string, entityType: string, entityId: string, metadata?: Record<string, any>) {
    try {
        await prisma.auditLog.create({
            data: {
                actorUserId: null,
                action,
                entityType,
                entityId,
                metadata: metadata || undefined,
            },
        });
    } catch (error) {
        console.warn("Failed to log SEO health audit event.", error);
    }
}

async function applySeoHealthPolicy(report: SeoHealthReport, config: SeoHealthConfig) {
    if (!config.pauseDraftsOnRed) return;

    const schedules = await prisma.contentSchedule.findMany();
    let paused = 0;
    let resumed = 0;
    const now = new Date().toISOString();

    for (const schedule of schedules) {
        const opts =
            schedule.options && typeof schedule.options === "object" && !Array.isArray(schedule.options)
                ? { ...(schedule.options as any) }
                : {};
        const jobType = opts.jobType || "CONTENT";
        if (jobType !== "CONTENT") continue;

        const wasPausedBySeo = Boolean(opts.seoHealthPaused);

        if (report.status === "RED") {
            if (schedule.enabled && !wasPausedBySeo) {
                await prisma.contentSchedule.update({
                    where: { id: schedule.id },
                    data: {
                        enabled: false,
                        options: {
                            ...opts,
                            seoHealthPaused: true,
                            seoHealthPausedAt: now,
                            seoHealthPrevEnabled: true,
                        },
                    },
                });
                await logSeoHealthAudit("SEO_HEALTH_PAUSE_SCHEDULE", "ContentSchedule", schedule.id, {
                    status: report.status,
                    pausedAt: now,
                });
                paused += 1;
            }
        } else if (wasPausedBySeo) {
            const shouldEnable = opts.seoHealthPrevEnabled !== false;
            await prisma.contentSchedule.update({
                where: { id: schedule.id },
                data: {
                    enabled: shouldEnable,
                    options: {
                        ...opts,
                        seoHealthPaused: false,
                        seoHealthPausedAt: null,
                        seoHealthPrevEnabled: false,
                    },
                },
            });
            await logSeoHealthAudit("SEO_HEALTH_RESUME_SCHEDULE", "ContentSchedule", schedule.id, {
                status: report.status,
                resumedAt: now,
                reEnabled: shouldEnable,
            });
            resumed += 1;
        }
    }

    if (paused > 0) {
        await sendAlert({
            title: "SEO health paused content schedules",
            message: `Paused ${paused} content schedules due to RED status.`,
            severity: "WARN",
            metadata: { paused, status: report.status },
        });
    }
    if (resumed > 0) {
        await sendAlert({
            title: "SEO health resumed content schedules",
            message: `Resumed ${resumed} content schedules after recovery.`,
            severity: "INFO",
            metadata: { resumed, status: report.status },
        });
    }
}

async function saveSnapshot(report: SeoHealthReport, config: SeoHealthConfig) {
    const updatedAt = new Date().toISOString();

    await prisma.contentStrategy.upsert({
        where: { key: SNAPSHOT_KEY },
        update: { value: { report, updatedAt, config } as any },
        create: { key: SNAPSHOT_KEY, value: { report, updatedAt, config } as any },
    });

    try {
        await prisma.seoHealthCheck.create({
            data: {
                checkDate: new Date(updatedAt),
                status: report.status,
                healthScore: report.healthScore,
                passedChecks: report.passedChecks,
                totalChecks: report.totalChecks,
                criticalCount: report.issueCounts.critical,
                warningCount: report.issueCounts.warning,
                infoCount: report.issueCounts.info,
                resultsJson: report as any,
            },
        });
    } catch (error) {
        // Do not block snapshot if table is unavailable in older environments.
        console.warn("Failed to persist seo_health_checks snapshot.", error);
    }

    return updatedAt;
}

async function loadSnapshot() {
    const fromStrategy = await prisma.contentStrategy.findUnique({ where: { key: SNAPSHOT_KEY } });
    const strategyValue = fromStrategy?.value as any;
    if (strategyValue?.report && strategyValue?.updatedAt) {
        return {
            report: strategyValue.report as SeoHealthReport,
            updatedAt: String(strategyValue.updatedAt),
        };
    }

    try {
        const latest = await prisma.seoHealthCheck.findFirst({
            orderBy: { checkDate: "desc" },
            select: { checkDate: true, resultsJson: true },
        });
        if (latest?.resultsJson) {
            return {
                report: latest.resultsJson as SeoHealthReport,
                updatedAt: latest.checkDate.toISOString(),
            };
        }
    } catch {
        // ignore
    }

    return null;
}

async function sendCriticalIssueEmail(report: SeoHealthReport, config: SeoHealthConfig) {
    if (report.issueCounts.critical <= 0) return;

    const to =
        config.criticalAlertEmail ||
        process.env.SEO_HEALTH_ALERT_EMAIL ||
        process.env.ADMIN_NOTIFY_EMAIL ||
        "";

    if (!to) return;

    const criticalIssues = report.issues.filter((issue) => issue.severity === "CRITICAL").slice(0, 40);
    const lines = [
        `SEO Health critical alert`,
        ``,
        `Status: ${report.status}`,
        `Health score: ${report.healthScore}%`,
        `Critical issues: ${report.issueCounts.critical}`,
        `Warnings: ${report.issueCounts.warning}`,
        `Checked pages: ${report.pagesAudited}`,
        `Checked at: ${new Date().toISOString()}`,
        ``,
        `Top critical issues:`,
        ...criticalIssues.map(
            (issue, idx) =>
                `${idx + 1}. [${issue.code}] ${issue.message}${issue.pagePath ? ` (${issue.pagePath})` : ""}`
        ),
        ``,
        `Admin: ${absoluteUrl("/admin/seo-health")}`,
    ];

    try {
        await sendEmail({
            to,
            subject: `SEO Health Alert: ${report.issueCounts.critical} critical issue(s)`,
            text: lines.join("\n"),
        });
    } catch (error) {
        console.error("Failed sending SEO health critical alert email", error);
    }
}

export function buildSeoHealthReportCsv(report: SeoHealthReport) {
    const escapeCsv = (value: unknown) => {
        const text = String(value ?? "");
        if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
        return text;
    };

    const header = [
        "severity",
        "code",
        "page_path",
        "url",
        "message",
        "fix_suggestion",
    ];

    const rows = report.issues.map((issue) => [
        issue.severity,
        issue.code,
        issue.pagePath || "",
        issue.url || "",
        issue.message,
        issue.fix,
    ]);

    return [header, ...rows].map((row) => row.map((cell) => escapeCsv(cell)).join(",")).join("\n");
}

export async function getSeoHealthConfig(): Promise<SeoHealthConfig> {
    const stored = await prisma.contentStrategy.findUnique({ where: { key: CONFIG_KEY } });
    return normalizeConfig(stored?.value as Partial<SeoHealthConfig> | undefined);
}

export async function updateSeoHealthConfig(patch: Partial<SeoHealthConfig>) {
    const current = await getSeoHealthConfig();
    const next = normalizeConfig({ ...current, ...patch });

    await prisma.contentStrategy.upsert({
        where: { key: CONFIG_KEY },
        update: { value: next as any },
        create: { key: CONFIG_KEY, value: next as any },
    });

    return next;
}

export async function refreshSeoHealthSnapshot(): Promise<SeoHealthSnapshot> {
    const config = await getSeoHealthConfig();
    await ensureSeoHealthSchedule();

    const report = await computeSeoHealthReport(config);
    const updatedAt = await saveSnapshot(report, config);

    await Promise.all([
        applySeoHealthPolicy(report, config),
        sendCriticalIssueEmail(report, config),
    ]);

    return { report, updatedAt, cached: false, stale: false, config };
}

export async function getSeoHealthSnapshot(
    options: { refresh?: boolean; refreshIfStale?: boolean } = {}
): Promise<SeoHealthSnapshot> {
    const config = await getSeoHealthConfig();
    if (options.refresh) return refreshSeoHealthSnapshot();

    const cached = await loadSnapshot();
    if (cached) {
        const ageHours = (Date.now() - new Date(cached.updatedAt).getTime()) / (1000 * 60 * 60);
        const stale = ageHours > config.autoRefreshHours;
        if (!stale || !options.refreshIfStale) {
            const trend = await getSeoHealthHistory(30);
            const report: SeoHealthReport = {
                ...cached.report,
                trend,
            };
            return { report, updatedAt: cached.updatedAt, cached: true, stale, config };
        }
    }

    return refreshSeoHealthSnapshot();
}

export async function getSeoHealthHistoryPoints(limit = 30) {
    return getSeoHealthHistory(limit);
}

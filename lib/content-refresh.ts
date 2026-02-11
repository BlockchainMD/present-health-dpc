import OpenAI from "openai";
import {
    ContentRefreshClassification,
    ContentRefreshHistoryType,
    ContentRefreshWorkflowStatus,
    Prisma,
} from "@prisma/client";

import { generateArticleRepurpose } from "@/lib/content-repurpose";
import { runArticleSafetyCheck, summarizeReview } from "@/lib/content-safety";
import { prisma } from "@/lib/prisma";

type PublishedArticle = {
    id: string;
    title: string;
    slug: string | null;
    content: string;
    excerpt: string | null;
    category: string | null;
    metaTitle: string | null;
    status: string;
    refreshRequested: boolean;
    refreshStatus: ContentRefreshWorkflowStatus;
    refreshStatusUpdatedAt: Date;
    nextRefreshDueAt: Date | null;
    lastRefreshedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

type PathMetricRow = {
    metricDate: Date;
    page: string;
    query: string;
    impressions: number;
    clicks: number;
    position: number;
};

type AggregateMetrics = {
    impressions: number;
    clicks: number;
    avgPosition: number;
    weightedPosition: number;
};

type QueryOpportunity = {
    query: string;
    impressions: number;
    clicks: number;
    avgPosition: number;
    ctr: number;
};

type TimeSensitiveInfo = {
    isTimeSensitive: boolean;
    reasons: string[];
};

type DetectionWindows = {
    currentStart: Date;
    currentEnd: Date;
    previousStart: Date;
    previousEnd: Date;
};

type DetectionRow = {
    articleId: string;
    title: string;
    slug: string | null;
    classification: ContentRefreshClassification;
    declineCount: number;
    clickDeclining: boolean;
    impressionsDeclining: boolean;
    positionDeclining: boolean;
    currentClicks: number;
    previousClicks: number;
    currentImpressions: number;
    previousImpressions: number;
    currentAvgPosition: number;
    previousAvgPosition: number;
    clicksDeltaPct: number;
    impressionsDeltaPct: number;
    avgPositionDelta: number;
    freshnessDays: number;
    stale90: boolean;
    stale180: boolean;
    isTimeSensitive: boolean;
    timeSensitiveReasons: string[];
    queryOpportunities: QueryOpportunity[];
    refreshStatus: ContentRefreshWorkflowStatus;
    refreshRequested: boolean;
    nextRefreshDueAt: string | null;
    lastRefreshedAt: string | null;
    updatedAt: string;
  };

type RefreshBriefPayload = {
    summary: string;
    newSections: Array<{
        heading: string;
        reason: string;
        keyPoints: string[];
    }>;
    outdatedInformation: string[];
    faqAdditions: string[];
    internalLinkRecommendations: Array<{
        label: string;
        url: string;
        reason: string;
    }>;
    keywordOpportunities: Array<{
        query: string;
        impressions: number;
        position: number;
        recommendation: string;
    }>;
    actionChecklist: string[];
};

type RefreshBriefGenerationResult = {
    provider: "claude" | "openai" | "heuristic";
    model: string;
    responseText: string;
    payload: RefreshBriefPayload;
};

const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

function compactWhitespace(value: unknown) {
    return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizePath(path: string) {
    const trimmed = compactWhitespace(path);
    if (!trimmed) return "/";

    try {
        const url = new URL(trimmed);
        let pathname = url.pathname || "/";
        pathname = pathname.replace(/\/+$/, "");
        if (!pathname.startsWith("/")) pathname = `/${pathname}`;
        return pathname || "/";
    } catch {
        let pathname = trimmed;
        if (!pathname.startsWith("/")) pathname = `/${pathname}`;
        pathname = pathname.replace(/\/+$/, "");
        return pathname || "/";
    }
}

function utcDay(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function safePercentChange(current: number, previous: number) {
    if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
    if (previous <= 0) return current > 0 ? 1 : 0;
    return (current - previous) / previous;
}

function aggregateMetrics(rows: PathMetricRow[]): AggregateMetrics {
    let impressions = 0;
    let clicks = 0;
    let weightedPosition = 0;

    for (const row of rows) {
        const rowImpressions = Math.max(0, Number(row.impressions || 0));
        const rowClicks = Math.max(0, Number(row.clicks || 0));
        const rowPosition = Number.isFinite(Number(row.position)) ? Number(row.position) : 0;

        impressions += rowImpressions;
        clicks += rowClicks;
        weightedPosition += rowPosition * (rowImpressions || 1);
    }

    const avgPosition = impressions > 0 ? weightedPosition / impressions : 0;

    return {
        impressions,
        clicks,
        avgPosition,
        weightedPosition,
    };
}

function toIsoDate(date: Date) {
    return utcDay(date).toISOString().slice(0, 10);
}

function buildDetectionWindows(referenceDate = new Date()): DetectionWindows {
    const currentEnd = utcDay(referenceDate);
    const currentStart = new Date(Date.UTC(currentEnd.getUTCFullYear(), currentEnd.getUTCMonth(), 1, 0, 0, 0, 0));
    const previousStart = new Date(
        Date.UTC(currentStart.getUTCFullYear(), currentStart.getUTCMonth() - 2, 1, 0, 0, 0, 0)
    );
    const previousEnd = addDays(currentStart, -1);

    return {
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
    };
}

function articlePathVariants(article: Pick<PublishedArticle, "slug" | "id">) {
    const out = new Set<string>();
    if (article.slug) {
        out.add(normalizePath(`/learn/${article.slug}`));
        out.add(normalizePath(`/blog/${article.slug}`));
    }
    out.add(normalizePath(`/learn/${article.id}`));
    out.add(normalizePath(`/blog/${article.id}`));
    return Array.from(out.values());
}

function detectTimeSensitive(article: Pick<PublishedArticle, "title" | "excerpt" | "metaTitle" | "content" | "category">): TimeSensitiveInfo {
    const reasons: string[] = [];

    const title = compactWhitespace(article.title).toLowerCase();
    const excerpt = compactWhitespace(article.excerpt || "").toLowerCase();
    const metaTitle = compactWhitespace(article.metaTitle || "").toLowerCase();
    const content = String(article.content || "").slice(0, 30000).toLowerCase();
    const category = compactWhitespace(article.category || "").toLowerCase();

    const combined = `${title}\n${excerpt}\n${metaTitle}\n${content}`;

    if (category.includes("hsa") || /\bhsa\b|\bhealth savings account\b|\birs\b|\btax\b/.test(combined)) {
        reasons.push("HSA/tax policy content");
    }

    if (category.includes("financ") || /\bpricing\b|\bmembership\s+cost\b|\b\$\d+/.test(combined)) {
        reasons.push("Pricing or financial content");
    }

    const yearMatches = combined.match(/\b20\d{2}\b/g) || [];
    const uniqueYears = Array.from(new Set(yearMatches));
    if (uniqueYears.length) {
        reasons.push(`Year-specific references (${uniqueYears.slice(0, 4).join(", ")})`);
    }

    if (category === "state-guides" || /\bstate\s+guide\b/.test(combined)) {
        reasons.push("State guidance content");
    }

    return {
        isTimeSensitive: reasons.length > 0,
        reasons,
    };
}

function freshnessDays(lastTouchedAt: Date, now = new Date()) {
    return Math.max(0, Math.floor((now.getTime() - lastTouchedAt.getTime()) / (24 * 60 * 60 * 1000)));
}

function getLastTouchedAt(article: Pick<PublishedArticle, "updatedAt" | "lastRefreshedAt">) {
    if (article.lastRefreshedAt && article.lastRefreshedAt > article.updatedAt) return article.lastRefreshedAt;
    return article.updatedAt;
}

function cadenceDays(article: Pick<PublishedArticle, "category">, timeSensitive: TimeSensitiveInfo) {
    const category = compactWhitespace(article.category || "").toLowerCase();
    if (category === "state-guides") return 90;
    if (timeSensitive.isTimeSensitive) return 90;
    return 180;
}

function buildQueryOpportunities(rows: PathMetricRow[]) {
    const byQuery = new Map<string, { impressions: number; clicks: number; weightedPosition: number }>();

    for (const row of rows) {
        const query = compactWhitespace(row.query || "").toLowerCase();
        if (!query) continue;

        const impressions = Math.max(0, Number(row.impressions || 0));
        const clicks = Math.max(0, Number(row.clicks || 0));
        const position = Number.isFinite(Number(row.position)) ? Number(row.position) : 0;

        const current = byQuery.get(query) || { impressions: 0, clicks: 0, weightedPosition: 0 };
        current.impressions += impressions;
        current.clicks += clicks;
        current.weightedPosition += position * (impressions || 1);
        byQuery.set(query, current);
    }

    return Array.from(byQuery.entries())
        .map(([query, row]) => {
            const avgPosition = row.impressions > 0 ? row.weightedPosition / row.impressions : 0;
            const ctr = row.impressions > 0 ? row.clicks / row.impressions : 0;
            return {
                query,
                impressions: row.impressions,
                clicks: row.clicks,
                avgPosition,
                ctr,
            };
        })
        .filter((row) => row.impressions >= 20 && row.avgPosition >= 8)
        .sort((a, b) => (b.impressions - a.impressions) || (a.avgPosition - b.avgPosition))
        .slice(0, 20);
}

function classificationFromDeclines(declineCount: number): ContentRefreshClassification {
    if (declineCount >= 3) return ContentRefreshClassification.URGENT;
    if (declineCount >= 1) return ContentRefreshClassification.MONITOR;
    return ContentRefreshClassification.HEALTHY;
}

function toRefreshWorkflowStatus(value: unknown): ContentRefreshWorkflowStatus | null {
    const raw = compactWhitespace(value).toUpperCase();
    if (!raw) return null;
    if (raw === ContentRefreshWorkflowStatus.NEEDS_REFRESH) return ContentRefreshWorkflowStatus.NEEDS_REFRESH;
    if (raw === ContentRefreshWorkflowStatus.REFRESH_IN_PROGRESS) return ContentRefreshWorkflowStatus.REFRESH_IN_PROGRESS;
    if (raw === ContentRefreshWorkflowStatus.REFRESHED) return ContentRefreshWorkflowStatus.REFRESHED;
    return null;
}

function shouldAutoFlagForRefresh(input: {
    classification: ContentRefreshClassification;
    stale90: boolean;
    stale180: boolean;
    isTimeSensitive: boolean;
}) {
    if (input.classification !== ContentRefreshClassification.HEALTHY) return true;
    if (input.stale180) return true;
    if (input.isTimeSensitive && input.stale90) return true;
    return false;
}

function parseJsonObject(text: string) {
    const raw = String(text || "").trim();
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
    } catch {
        // noop
    }

    const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
        try {
            const parsed = JSON.parse(fenced[1].trim());
            if (parsed && typeof parsed === "object") return parsed;
        } catch {
            // noop
        }
    }

    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
        try {
            const parsed = JSON.parse(raw.slice(start, end + 1));
            if (parsed && typeof parsed === "object") return parsed;
        } catch {
            // noop
        }
    }

    return null;
}

function normalizeStringArray(value: unknown, max = 12) {
    if (!Array.isArray(value)) return [] as string[];
    const out: string[] = [];
    for (const item of value) {
        const text = compactWhitespace(item);
        if (!text) continue;
        if (out.includes(text)) continue;
        out.push(text);
        if (out.length >= max) break;
    }
    return out;
}

function normalizeBriefPayload(payload: unknown, fallback: RefreshBriefPayload): RefreshBriefPayload {
    const obj = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

    const summary = compactWhitespace(obj.summary || fallback.summary) || fallback.summary;

    const newSections = Array.isArray(obj.newSections)
        ? obj.newSections
            .map((item) => {
                if (!item || typeof item !== "object") return null;
                const row = item as Record<string, unknown>;
                const heading = compactWhitespace(row.heading || row.h2 || "");
                const reason = compactWhitespace(row.reason || "");
                const keyPoints = normalizeStringArray(row.keyPoints, 8);
                if (!heading) return null;
                return { heading, reason: reason || "Add coverage to address newer search expectations.", keyPoints };
            })
            .filter((x): x is NonNullable<typeof x> => Boolean(x))
            .slice(0, 10)
        : fallback.newSections;

    const outdatedInformation = normalizeStringArray(obj.outdatedInformation, 12);
    const faqAdditions = normalizeStringArray(obj.faqAdditions, 12);

    const internalLinkRecommendations = Array.isArray(obj.internalLinkRecommendations)
        ? obj.internalLinkRecommendations
            .map((item) => {
                if (!item || typeof item !== "object") return null;
                const row = item as Record<string, unknown>;
                const label = compactWhitespace(row.label || "");
                const url = compactWhitespace(row.url || "");
                const reason = compactWhitespace(row.reason || "");
                if (!label || !url) return null;
                return { label, url, reason: reason || "Relevant internal context for this topic." };
            })
            .filter((x): x is NonNullable<typeof x> => Boolean(x))
            .slice(0, 20)
        : fallback.internalLinkRecommendations;

    const keywordOpportunities = Array.isArray(obj.keywordOpportunities)
        ? obj.keywordOpportunities
            .map((item) => {
                if (!item || typeof item !== "object") return null;
                const row = item as Record<string, unknown>;
                const query = compactWhitespace(row.query || "");
                if (!query) return null;
                const impressions = Number.isFinite(Number(row.impressions)) ? Number(row.impressions) : 0;
                const position = Number.isFinite(Number(row.position)) ? Number(row.position) : 0;
                const recommendation =
                    compactWhitespace(row.recommendation || "") ||
                    "Expand the article to answer this query directly with concise heading-level coverage.";
                return { query, impressions, position, recommendation };
            })
            .filter((x): x is NonNullable<typeof x> => Boolean(x))
            .slice(0, 20)
        : fallback.keywordOpportunities;

    const actionChecklist = normalizeStringArray(obj.actionChecklist, 20);

    return {
        summary,
        newSections: newSections.length ? newSections : fallback.newSections,
        outdatedInformation: outdatedInformation.length ? outdatedInformation : fallback.outdatedInformation,
        faqAdditions: faqAdditions.length ? faqAdditions : fallback.faqAdditions,
        internalLinkRecommendations: internalLinkRecommendations.length
            ? internalLinkRecommendations
            : fallback.internalLinkRecommendations,
        keywordOpportunities: keywordOpportunities.length ? keywordOpportunities : fallback.keywordOpportunities,
        actionChecklist: actionChecklist.length ? actionChecklist : fallback.actionChecklist,
    };
}

function briefPayloadToMarkdown(payload: RefreshBriefPayload) {
    const lines: string[] = [];
    lines.push("## Refresh Summary");
    lines.push(payload.summary);
    lines.push("");

    lines.push("## New Sections To Add");
    if (payload.newSections.length) {
        for (const section of payload.newSections) {
            lines.push(`- **${section.heading}**: ${section.reason}`);
            for (const point of section.keyPoints) {
                lines.push(`  - ${point}`);
            }
        }
    } else {
        lines.push("- No new section recommendations.");
    }
    lines.push("");

    lines.push("## Outdated Information To Update");
    if (payload.outdatedInformation.length) {
        for (const item of payload.outdatedInformation) lines.push(`- ${item}`);
    } else {
        lines.push("- No major outdated items detected.");
    }
    lines.push("");

    lines.push("## FAQ Additions");
    if (payload.faqAdditions.length) {
        for (const item of payload.faqAdditions) lines.push(`- ${item}`);
    } else {
        lines.push("- No FAQ suggestions.");
    }
    lines.push("");

    lines.push("## Internal Links To Add");
    if (payload.internalLinkRecommendations.length) {
        for (const row of payload.internalLinkRecommendations) {
            lines.push(`- [${row.label}](${row.url}) - ${row.reason}`);
        }
    } else {
        lines.push("- No internal link suggestions.");
    }
    lines.push("");

    lines.push("## Keyword Opportunities");
    if (payload.keywordOpportunities.length) {
        for (const row of payload.keywordOpportunities) {
            lines.push(
                `- **${row.query}** (impressions: ${row.impressions}, avg position: ${row.position.toFixed(1)}): ${row.recommendation}`
            );
        }
    } else {
        lines.push("- No keyword opportunities identified.");
    }
    lines.push("");

    lines.push("## Action Checklist");
    if (payload.actionChecklist.length) {
        for (const item of payload.actionChecklist) lines.push(`- [ ] ${item}`);
    } else {
        lines.push("- [ ] No checklist provided.");
    }

    return lines.join("\n").trim();
}

function buildFallbackBrief(input: {
    article: PublishedArticle;
    snapshot: {
        classification: ContentRefreshClassification;
        clicksDeltaPct: number;
        impressionsDeltaPct: number;
        avgPositionDelta: number;
        queryOpportunities: QueryOpportunity[];
    } | null;
    internalLinks: Array<{ label: string; url: string }>;
}): RefreshBriefPayload {
    const queryOpportunities = (input.snapshot?.queryOpportunities || []).slice(0, 8).map((row) => ({
        query: row.query,
        impressions: row.impressions,
        position: row.avgPosition,
        recommendation: "Add a direct heading and concise answer targeting this query.",
    }));

    return {
        summary:
            input.snapshot?.classification === ContentRefreshClassification.URGENT
                ? "This article shows significant Search Console decay and should be refreshed immediately."
                : input.snapshot?.classification === ContentRefreshClassification.MONITOR
                    ? "This article is showing early decay signals. Refresh key sections and monitor performance."
                    : "This article is generally healthy, but targeted freshness improvements can protect rankings.",
        newSections: [
            {
                heading: "What Changed Recently",
                reason: "Search behavior shifts over time. Add a section that addresses current policy/process updates.",
                keyPoints: [
                    "Summarize the latest practical changes relevant to this topic.",
                    "Call out what readers should verify by date/state.",
                ],
            },
            {
                heading: "Common Mistakes and Better Alternatives",
                reason: "Competing pages often add practical pitfalls and decision support.",
                keyPoints: [
                    "List 3-5 mistakes readers make.",
                    "Offer safer, clearer alternatives with caveats.",
                ],
            },
        ],
        outdatedInformation: [
            "Verify that all numerical examples and year-specific references are still current.",
            "Re-check policy-sensitive statements (HSA, tax, pricing, and state-specific constraints).",
            "Update any stale outbound references and citations.",
        ],
        faqAdditions: [
            "What changed this year that affects this topic?",
            "How does this work in my state?",
            "What does this not cover?",
            "When should I use emergency care instead?",
        ],
        internalLinkRecommendations: input.internalLinks.slice(0, 8).map((row) => ({
            ...row,
            reason: "Newer related content published after the original article date.",
        })),
        keywordOpportunities: queryOpportunities,
        actionChecklist: [
            "Update introduction and conclusion with current-year context.",
            "Add at least one new FAQ tied to recent query demand.",
            "Add internal links to newer relevant pages/articles.",
            "Re-run safety check before publish.",
            "Regenerate repurposed content after publish.",
        ],
    };
}

async function callClaude(prompt: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!apiKey) return null;

    const model = process.env.CONTENT_REFRESH_ANTHROPIC_MODEL || DEFAULT_CLAUDE_MODEL;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model,
            temperature: 0.2,
            max_tokens: 3200,
            messages: [{ role: "user", content: prompt }],
        }),
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Claude request failed (${res.status}): ${detail || "unknown error"}`);
    }

    const data = (await res.json().catch(() => null)) as any;
    const text = Array.isArray(data?.content)
        ? data.content
            .map((part: any) => (part?.type === "text" && typeof part?.text === "string" ? part.text : ""))
            .join("\n")
            .trim()
        : "";

    return text || null;
}

async function callOpenAi(prompt: string) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    const openai = new OpenAI({ apiKey });
    const model = process.env.CONTENT_REFRESH_OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
    const response = await openai.chat.completions.create({
        model,
        temperature: 0.2,
        max_tokens: 2600,
        messages: [
            {
                role: "system",
                content:
                    "You are a senior SEO editor for healthcare content. Return valid JSON only with no markdown wrapper.",
            },
            { role: "user", content: prompt },
        ],
    });

    return response.choices[0]?.message?.content?.trim() || null;
}

function buildRefreshBriefPrompt(input: {
    article: PublishedArticle;
    snapshot: Prisma.ContentRefreshSnapshotGetPayload<{ select: {
        classification: true;
        currentClicks: true;
        previousClicks: true;
        currentImpressions: true;
        previousImpressions: true;
        currentAvgPosition: true;
        previousAvgPosition: true;
        clicksDeltaPct: true;
        impressionsDeltaPct: true;
        avgPositionDelta: true;
        queryOpportunities: true;
    } }> | null;
    queryOpportunities: QueryOpportunity[];
    internalLinks: Array<{ label: string; url: string }>;
}) {
    const snapshot = input.snapshot;
    const queryRows = input.queryOpportunities
        .map(
            (row, index) =>
                `${index + 1}. ${row.query} | impressions=${row.impressions} | clicks=${row.clicks} | avgPosition=${row.avgPosition.toFixed(2)} | ctr=${(row.ctr * 100).toFixed(2)}%`
        )
        .join("\n");

    const internalLinks = input.internalLinks
        .map((row, index) => `${index + 1}. ${row.label} -> ${row.url}`)
        .join("\n");

    return [
        "You are a content refresh strategist for Present Health, a telehealth-first Direct Primary Care website.",
        "Generate a practical refresh brief for an existing article using both content and Search Console performance context.",
        "Return strict JSON only. No markdown wrappers.",
        "",
        `Article title: ${input.article.title}`,
        `Article slug: ${input.article.slug || "(none)"}`,
        `Article category: ${input.article.category || "(none)"}`,
        `Article published status: ${input.article.status}`,
        `Last updated: ${input.article.updatedAt.toISOString()}`,
        `Last refreshed: ${input.article.lastRefreshedAt ? input.article.lastRefreshedAt.toISOString() : "(never)"}`,
        "",
        "Decay snapshot:",
        snapshot
            ? [
                `- classification: ${snapshot.classification}`,
                `- clicks: current=${snapshot.currentClicks}, previous=${snapshot.previousClicks}, deltaPct=${(snapshot.clicksDeltaPct * 100).toFixed(2)}%`,
                `- impressions: current=${snapshot.currentImpressions}, previous=${snapshot.previousImpressions}, deltaPct=${(snapshot.impressionsDeltaPct * 100).toFixed(2)}%`,
                `- avgPosition: current=${snapshot.currentAvgPosition.toFixed(2)}, previous=${snapshot.previousAvgPosition.toFixed(2)}, delta=${snapshot.avgPositionDelta.toFixed(2)}`,
            ].join("\n")
            : "- No stored decay snapshot available.",
        "",
        "Queries driving traffic and opportunities:",
        queryRows || "(none)",
        "",
        "Internal links to newer content published since this article:",
        internalLinks || "(none)",
        "",
        "Current article content:",
        String(input.article.content || "").slice(0, 18000),
        "",
        "Output JSON shape:",
        JSON.stringify(
            {
                summary: "One-paragraph summary of why the article needs refresh",
                newSections: [
                    {
                        heading: "",
                        reason: "",
                        keyPoints: [""],
                    },
                ],
                outdatedInformation: [""],
                faqAdditions: [""],
                internalLinkRecommendations: [
                    {
                        label: "",
                        url: "",
                        reason: "",
                    },
                ],
                keywordOpportunities: [
                    {
                        query: "",
                        impressions: 0,
                        position: 0,
                        recommendation: "",
                    },
                ],
                actionChecklist: [""],
            },
            null,
            2
        ),
        "",
        "Rules:",
        "- Prioritize actions likely to recover rankings quickly.",
        "- Do not provide medical advice or diagnosis language.",
        "- Prefer concrete editorial actions over generic guidance.",
    ].join("\n");
}

async function generateRefreshBriefWithLlm(input: {
    article: PublishedArticle;
    snapshot: Prisma.ContentRefreshSnapshotGetPayload<{ select: {
        id: true;
        classification: true;
        currentClicks: true;
        previousClicks: true;
        currentImpressions: true;
        previousImpressions: true;
        currentAvgPosition: true;
        previousAvgPosition: true;
        clicksDeltaPct: true;
        impressionsDeltaPct: true;
        avgPositionDelta: true;
        queryOpportunities: true;
    } }> | null;
    queryOpportunities: QueryOpportunity[];
    internalLinks: Array<{ label: string; url: string }>;
}): Promise<RefreshBriefGenerationResult> {
    const fallbackPayload = buildFallbackBrief({
        article: input.article,
        snapshot: input.snapshot
            ? {
                classification: input.snapshot.classification,
                clicksDeltaPct: input.snapshot.clicksDeltaPct,
                impressionsDeltaPct: input.snapshot.impressionsDeltaPct,
                avgPositionDelta: input.snapshot.avgPositionDelta,
                queryOpportunities: input.queryOpportunities,
            }
            : null,
        internalLinks: input.internalLinks,
    });

    const prompt = buildRefreshBriefPrompt({
        article: input.article,
        snapshot: input.snapshot,
        queryOpportunities: input.queryOpportunities,
        internalLinks: input.internalLinks,
    });

    try {
        const claudeText = await callClaude(prompt);
        if (claudeText) {
            const parsed = parseJsonObject(claudeText);
            if (parsed) {
                return {
                    provider: "claude",
                    model: process.env.CONTENT_REFRESH_ANTHROPIC_MODEL || DEFAULT_CLAUDE_MODEL,
                    responseText: claudeText,
                    payload: normalizeBriefPayload(parsed, fallbackPayload),
                };
            }
        }
    } catch (error) {
        console.error("[content-refresh] Claude brief generation failed", error);
    }

    try {
        const openAiText = await callOpenAi(prompt);
        if (openAiText) {
            const parsed = parseJsonObject(openAiText);
            if (parsed) {
                return {
                    provider: "openai",
                    model: process.env.CONTENT_REFRESH_OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
                    responseText: openAiText,
                    payload: normalizeBriefPayload(parsed, fallbackPayload),
                };
            }
        }
    } catch (error) {
        console.error("[content-refresh] OpenAI brief generation failed", error);
    }

    return {
        provider: "heuristic",
        model: "fallback",
        responseText: JSON.stringify(fallbackPayload, null, 2),
        payload: fallbackPayload,
    };
}

export async function runContentRefreshDetection(options?: {
    actorUserId?: string | null;
    referenceDate?: Date;
}) {
    const actorUserId = options?.actorUserId || null;
    const windows = buildDetectionWindows(options?.referenceDate || new Date());

    const articles = await prisma.article.findMany({
        where: {
            status: "PUBLISHED",
            slug: { not: null },
        },
        orderBy: { updatedAt: "desc" },
        select: {
            id: true,
            title: true,
            slug: true,
            content: true,
            excerpt: true,
            category: true,
            metaTitle: true,
            status: true,
            refreshRequested: true,
            refreshStatus: true,
            refreshStatusUpdatedAt: true,
            nextRefreshDueAt: true,
            lastRefreshedAt: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!articles.length) {
        return {
            period: {
                currentStart: toIsoDate(windows.currentStart),
                currentEnd: toIsoDate(windows.currentEnd),
                previousStart: toIsoDate(windows.previousStart),
                previousEnd: toIsoDate(windows.previousEnd),
            },
            totals: {
                scanned: 0,
                urgent: 0,
                monitor: 0,
                healthy: 0,
                needsRefresh: 0,
            },
            rows: [] as DetectionRow[],
        };
    }

    const pathToArticleIds = new Map<string, string[]>();
    for (const article of articles) {
        const paths = articlePathVariants(article);
        for (const path of paths) {
            const existing = pathToArticleIds.get(path) || [];
            if (!existing.includes(article.id)) existing.push(article.id);
            pathToArticleIds.set(path, existing);
        }
    }

    const allPaths = Array.from(pathToArticleIds.keys());

    const [rows, latestSnapshots] = await Promise.all([
        prisma.searchConsolePageQueryDaily.findMany({
            where: {
                metricDate: {
                    gte: windows.previousStart,
                    lte: windows.currentEnd,
                },
                page: { in: allPaths },
            },
            select: {
                metricDate: true,
                page: true,
                query: true,
                impressions: true,
                clicks: true,
                position: true,
            },
        }),
        prisma.contentRefreshSnapshot.findMany({
            where: {
                articleId: { in: articles.map((article) => article.id) },
            },
            orderBy: [{ createdAt: "desc" }],
            select: {
                articleId: true,
                classification: true,
                declineCount: true,
                createdAt: true,
            },
        }),
    ]);

    const latestSnapshotByArticle = new Map<
        string,
        { classification: ContentRefreshClassification; declineCount: number; createdAt: Date }
    >();
    for (const row of latestSnapshots) {
        if (!latestSnapshotByArticle.has(row.articleId)) {
            latestSnapshotByArticle.set(row.articleId, {
                classification: row.classification,
                declineCount: row.declineCount,
                createdAt: row.createdAt,
            });
        }
    }

    const rowsByArticle = new Map<string, { current: PathMetricRow[]; previous: PathMetricRow[] }>();
    for (const article of articles) {
        rowsByArticle.set(article.id, { current: [], previous: [] });
    }

    for (const row of rows) {
        const normalizedPage = normalizePath(row.page);
        const articleIds = pathToArticleIds.get(normalizedPage) || [];
        if (!articleIds.length) continue;

        const metricDate = utcDay(new Date(row.metricDate));
        const isCurrent = metricDate >= windows.currentStart && metricDate <= windows.currentEnd;
        const isPrevious = metricDate >= windows.previousStart && metricDate <= windows.previousEnd;
        if (!isCurrent && !isPrevious) continue;

        for (const articleId of articleIds) {
            const bucket = rowsByArticle.get(articleId);
            if (!bucket) continue;

            const normalizedRow: PathMetricRow = {
                metricDate,
                page: normalizedPage,
                query: compactWhitespace(row.query || "").toLowerCase(),
                impressions: Number(row.impressions || 0),
                clicks: Number(row.clicks || 0),
                position: Number(row.position || 0),
            };

            if (isCurrent) bucket.current.push(normalizedRow);
            if (isPrevious) bucket.previous.push(normalizedRow);
        }
    }

    const detectionRows: DetectionRow[] = [];

    for (const article of articles) {
        const bucket = rowsByArticle.get(article.id) || { current: [], previous: [] };

        const currentMetrics = aggregateMetrics(bucket.current);
        const previousMetrics = aggregateMetrics(bucket.previous);

        const clicksDeltaPct = safePercentChange(currentMetrics.clicks, previousMetrics.clicks);
        const impressionsDeltaPct = safePercentChange(currentMetrics.impressions, previousMetrics.impressions);
        const avgPositionDelta = currentMetrics.avgPosition - previousMetrics.avgPosition;

        const clickDeclining = previousMetrics.clicks > 0 && clicksDeltaPct < -0.2;
        const impressionsDeclining = previousMetrics.impressions > 0 && impressionsDeltaPct < -0.3;
        const positionDeclining = previousMetrics.impressions > 0 && avgPositionDelta > 3;

        const declineCount = [clickDeclining, impressionsDeclining, positionDeclining].filter(Boolean).length;
        const classification = classificationFromDeclines(declineCount);

        const timeSensitive = detectTimeSensitive(article);
        const lastTouchedAt = getLastTouchedAt(article);
        const freshness = freshnessDays(lastTouchedAt);
        const stale90 = freshness > 90;
        const stale180 = freshness > 180;

        const needsRefresh = shouldAutoFlagForRefresh({
            classification,
            stale90,
            stale180,
            isTimeSensitive: timeSensitive.isTimeSensitive,
        });

        const nextStatus =
            article.refreshStatus === ContentRefreshWorkflowStatus.REFRESH_IN_PROGRESS
                ? ContentRefreshWorkflowStatus.REFRESH_IN_PROGRESS
                : needsRefresh
                    ? ContentRefreshWorkflowStatus.NEEDS_REFRESH
                    : ContentRefreshWorkflowStatus.REFRESHED;

        const nextDueAt = (() => {
            const days = cadenceDays(article, timeSensitive);
            return addDays(lastTouchedAt, days);
        })();

        const queryOpportunities = buildQueryOpportunities(bucket.current);

        const snapshot = await prisma.contentRefreshSnapshot.upsert({
            where: {
                articleId_periodCurrentStart_periodCurrentEnd: {
                    articleId: article.id,
                    periodCurrentStart: windows.currentStart,
                    periodCurrentEnd: windows.currentEnd,
                },
            },
            create: {
                articleId: article.id,
                periodCurrentStart: windows.currentStart,
                periodCurrentEnd: windows.currentEnd,
                periodPreviousStart: windows.previousStart,
                periodPreviousEnd: windows.previousEnd,
                currentClicks: currentMetrics.clicks,
                previousClicks: previousMetrics.clicks,
                currentImpressions: currentMetrics.impressions,
                previousImpressions: previousMetrics.impressions,
                currentAvgPosition: currentMetrics.avgPosition,
                previousAvgPosition: previousMetrics.avgPosition,
                clicksDeltaPct,
                impressionsDeltaPct,
                avgPositionDelta,
                clickDeclining,
                impressionsDeclining,
                positionDeclining,
                classification,
                declineCount,
                freshnessDays: freshness,
                stale90,
                stale180,
                isTimeSensitive: timeSensitive.isTimeSensitive,
                timeSensitiveReasons: timeSensitive.reasons,
                queryOpportunities: queryOpportunities as any,
            },
            update: {
                periodPreviousStart: windows.previousStart,
                periodPreviousEnd: windows.previousEnd,
                currentClicks: currentMetrics.clicks,
                previousClicks: previousMetrics.clicks,
                currentImpressions: currentMetrics.impressions,
                previousImpressions: previousMetrics.impressions,
                currentAvgPosition: currentMetrics.avgPosition,
                previousAvgPosition: previousMetrics.avgPosition,
                clicksDeltaPct,
                impressionsDeltaPct,
                avgPositionDelta,
                clickDeclining,
                impressionsDeclining,
                positionDeclining,
                classification,
                declineCount,
                freshnessDays: freshness,
                stale90,
                stale180,
                isTimeSensitive: timeSensitive.isTimeSensitive,
                timeSensitiveReasons: timeSensitive.reasons,
                queryOpportunities: queryOpportunities as any,
            },
            select: {
                id: true,
            },
        });

        const previousSnapshot = latestSnapshotByArticle.get(article.id);
        const classificationChanged =
            previousSnapshot &&
            (previousSnapshot.classification !== classification || previousSnapshot.declineCount !== declineCount);

        await prisma.article.update({
            where: { id: article.id },
            data: {
                refreshRequested: needsRefresh,
                refreshStatus: nextStatus,
                refreshStatusUpdatedAt:
                    nextStatus !== article.refreshStatus ? new Date() : article.refreshStatusUpdatedAt,
                nextRefreshDueAt: nextDueAt,
            },
        });

        if (nextStatus !== article.refreshStatus) {
            await prisma.contentRefreshHistory.create({
                data: {
                    articleId: article.id,
                    eventType: ContentRefreshHistoryType.STATUS_CHANGE,
                    fromStatus: article.refreshStatus,
                    toStatus: nextStatus,
                    summary: `Refresh workflow status changed to ${nextStatus}.`,
                    details: {
                        classification,
                        declineCount,
                        stale90,
                        stale180,
                        isTimeSensitive: timeSensitive.isTimeSensitive,
                    },
                    createdByUserId: actorUserId,
                },
            });
        }

        if (classificationChanged || classification === ContentRefreshClassification.URGENT) {
            await prisma.contentRefreshHistory.create({
                data: {
                    articleId: article.id,
                    eventType: ContentRefreshHistoryType.DETECTION,
                    summary:
                        classification === ContentRefreshClassification.URGENT
                            ? "Automated decay detection marked article as URGENT refresh."
                            : `Automated decay detection updated classification to ${classification}.`,
                    details: {
                        snapshotId: snapshot.id,
                        classification,
                        declineCount,
                        clickDeclining,
                        impressionsDeclining,
                        positionDeclining,
                        clicksDeltaPct,
                        impressionsDeltaPct,
                        avgPositionDelta,
                    },
                    createdByUserId: actorUserId,
                },
            });
        }

        detectionRows.push({
            articleId: article.id,
            title: article.title,
            slug: article.slug,
            classification,
            declineCount,
            clickDeclining,
            impressionsDeclining,
            positionDeclining,
            currentClicks: currentMetrics.clicks,
            previousClicks: previousMetrics.clicks,
            currentImpressions: currentMetrics.impressions,
            previousImpressions: previousMetrics.impressions,
            currentAvgPosition: currentMetrics.avgPosition,
            previousAvgPosition: previousMetrics.avgPosition,
            clicksDeltaPct,
            impressionsDeltaPct,
            avgPositionDelta,
            freshnessDays: freshness,
            stale90,
            stale180,
            isTimeSensitive: timeSensitive.isTimeSensitive,
            timeSensitiveReasons: timeSensitive.reasons,
            queryOpportunities,
            refreshStatus: nextStatus,
            refreshRequested: needsRefresh,
            nextRefreshDueAt: nextDueAt.toISOString(),
            lastRefreshedAt: article.lastRefreshedAt ? article.lastRefreshedAt.toISOString() : null,
            updatedAt: article.updatedAt.toISOString(),
        });
    }

    const totals = detectionRows.reduce(
        (acc, row) => {
            acc.scanned += 1;
            if (row.classification === ContentRefreshClassification.URGENT) acc.urgent += 1;
            else if (row.classification === ContentRefreshClassification.MONITOR) acc.monitor += 1;
            else acc.healthy += 1;

            if (row.refreshStatus === ContentRefreshWorkflowStatus.NEEDS_REFRESH) acc.needsRefresh += 1;
            if (row.refreshStatus === ContentRefreshWorkflowStatus.REFRESH_IN_PROGRESS) acc.inProgress += 1;
            if (row.refreshStatus === ContentRefreshWorkflowStatus.REFRESHED) acc.refreshed += 1;

            if (row.stale90) acc.stale90 += 1;
            if (row.stale180) acc.stale180 += 1;

            return acc;
        },
        {
            scanned: 0,
            urgent: 0,
            monitor: 0,
            healthy: 0,
            needsRefresh: 0,
            inProgress: 0,
            refreshed: 0,
            stale90: 0,
            stale180: 0,
        }
    );

    detectionRows.sort((a, b) => {
        const severity = (value: ContentRefreshClassification) => {
            if (value === ContentRefreshClassification.URGENT) return 3;
            if (value === ContentRefreshClassification.MONITOR) return 2;
            return 1;
        };
        const s = severity(b.classification) - severity(a.classification);
        if (s !== 0) return s;
        return b.currentImpressions - a.currentImpressions;
    });

    return {
        period: {
            currentStart: toIsoDate(windows.currentStart),
            currentEnd: toIsoDate(windows.currentEnd),
            previousStart: toIsoDate(windows.previousStart),
            previousEnd: toIsoDate(windows.previousEnd),
        },
        totals,
        rows: detectionRows,
    };
}

function mapLatestByArticle<T extends { articleId: string }>(items: T[]) {
    const map = new Map<string, T>();
    for (const item of items) {
        if (!map.has(item.articleId)) map.set(item.articleId, item);
    }
    return map;
}

export async function getContentRefreshDashboard(options?: { autoDetectIfStale?: boolean }) {
    const autoDetectIfStale = options?.autoDetectIfStale !== false;

    const latestSnapshot = await prisma.contentRefreshSnapshot.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
    });

    const now = new Date();
    const staleDays = latestSnapshot
        ? Math.floor((now.getTime() - latestSnapshot.createdAt.getTime()) / (24 * 60 * 60 * 1000))
        : Number.POSITIVE_INFINITY;

    let autoDetectionResult: Awaited<ReturnType<typeof runContentRefreshDetection>> | null = null;
    if (autoDetectIfStale && staleDays >= 7) {
        autoDetectionResult = await runContentRefreshDetection();
    }

    const articles = await prisma.article.findMany({
        where: {
            status: "PUBLISHED",
            slug: { not: null },
        },
        orderBy: [{ refreshStatus: "asc" }, { updatedAt: "desc" }],
        select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            category: true,
            status: true,
            refreshRequested: true,
            refreshStatus: true,
            refreshStatusUpdatedAt: true,
            nextRefreshDueAt: true,
            lastRefreshedAt: true,
            createdAt: true,
            updatedAt: true,
            content: true,
            metaTitle: true,
        },
    });

    const articleIds = articles.map((article) => article.id);

    const [snapshots, briefs, history] = await Promise.all([
        prisma.contentRefreshSnapshot.findMany({
            where: { articleId: { in: articleIds } },
            orderBy: [{ createdAt: "desc" }],
        }),
        prisma.contentRefreshBrief.findMany({
            where: { articleId: { in: articleIds } },
            orderBy: [{ createdAt: "desc" }],
            select: {
                id: true,
                articleId: true,
                status: true,
                createdAt: true,
                provider: true,
                model: true,
            },
        }),
        prisma.contentRefreshHistory.findMany({
            where: { articleId: { in: articleIds } },
            orderBy: [{ createdAt: "desc" }],
            take: 500,
            select: {
                id: true,
                articleId: true,
                eventType: true,
                fromStatus: true,
                toStatus: true,
                summary: true,
                details: true,
                createdByUserId: true,
                createdAt: true,
            },
        }),
    ]);

    const latestSnapshotByArticle = mapLatestByArticle(snapshots);
    const latestBriefByArticle = mapLatestByArticle(briefs);

    const rows = articles.map((article) => {
        const snapshot = latestSnapshotByArticle.get(article.id);
        const brief = latestBriefByArticle.get(article.id) || null;

        const timeSensitive = snapshot
            ? {
                isTimeSensitive: snapshot.isTimeSensitive,
                reasons: Array.isArray(snapshot.timeSensitiveReasons)
                    ? snapshot.timeSensitiveReasons.map((x) => String(x || "")).filter(Boolean)
                    : [],
            }
            : detectTimeSensitive(article);

        const lastTouched = getLastTouchedAt(article);
        const freshDays = snapshot?.freshnessDays ?? freshnessDays(lastTouched);
        const stale90 = snapshot?.stale90 ?? freshDays > 90;
        const stale180 = snapshot?.stale180 ?? freshDays > 180;

        return {
            articleId: article.id,
            title: article.title,
            slug: article.slug,
            path: article.slug ? `/learn/${article.slug}` : `/learn/${article.id}`,
            status: article.status,
            category: article.category,
            refreshStatus: article.refreshStatus,
            refreshRequested: article.refreshRequested,
            refreshStatusUpdatedAt: article.refreshStatusUpdatedAt.toISOString(),
            nextRefreshDueAt: article.nextRefreshDueAt ? article.nextRefreshDueAt.toISOString() : null,
            lastRefreshedAt: article.lastRefreshedAt ? article.lastRefreshedAt.toISOString() : null,
            lastUpdatedAt: article.updatedAt.toISOString(),
            freshnessDays: freshDays,
            stale90,
            stale180,
            timeSensitive: timeSensitive.isTimeSensitive,
            timeSensitiveReasons: timeSensitive.reasons,
            decay: snapshot
                ? {
                    classification: snapshot.classification,
                    declineCount: snapshot.declineCount,
                    clickDeclining: snapshot.clickDeclining,
                    impressionsDeclining: snapshot.impressionsDeclining,
                    positionDeclining: snapshot.positionDeclining,
                    currentClicks: snapshot.currentClicks,
                    previousClicks: snapshot.previousClicks,
                    currentImpressions: snapshot.currentImpressions,
                    previousImpressions: snapshot.previousImpressions,
                    currentAvgPosition: snapshot.currentAvgPosition,
                    previousAvgPosition: snapshot.previousAvgPosition,
                    clicksDeltaPct: snapshot.clicksDeltaPct,
                    impressionsDeltaPct: snapshot.impressionsDeltaPct,
                    avgPositionDelta: snapshot.avgPositionDelta,
                    periodCurrentStart: snapshot.periodCurrentStart.toISOString(),
                    periodCurrentEnd: snapshot.periodCurrentEnd.toISOString(),
                    periodPreviousStart: snapshot.periodPreviousStart.toISOString(),
                    periodPreviousEnd: snapshot.periodPreviousEnd.toISOString(),
                    snapshotCreatedAt: snapshot.createdAt.toISOString(),
                    queryOpportunities: Array.isArray(snapshot.queryOpportunities)
                        ? snapshot.queryOpportunities
                        : [],
                }
                : null,
            latestBrief: brief
                ? {
                    id: brief.id,
                    status: brief.status,
                    createdAt: brief.createdAt.toISOString(),
                    provider: brief.provider,
                    model: brief.model,
                }
                : null,
        };
    });

    const recentHistory = history.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
    }));

    const totals = rows.reduce(
        (acc, row) => {
            const classification = row.decay?.classification || ContentRefreshClassification.HEALTHY;
            if (classification === ContentRefreshClassification.URGENT) acc.urgent += 1;
            else if (classification === ContentRefreshClassification.MONITOR) acc.monitor += 1;
            else acc.healthy += 1;

            if (row.refreshStatus === ContentRefreshWorkflowStatus.NEEDS_REFRESH) acc.needsRefresh += 1;
            if (row.refreshStatus === ContentRefreshWorkflowStatus.REFRESH_IN_PROGRESS) acc.inProgress += 1;
            if (row.refreshStatus === ContentRefreshWorkflowStatus.REFRESHED) acc.refreshed += 1;

            if (row.stale90) acc.stale90 += 1;
            if (row.stale180) acc.stale180 += 1;
            if (row.timeSensitive) acc.timeSensitive += 1;

            if (row.nextRefreshDueAt && new Date(row.nextRefreshDueAt) < now && row.refreshStatus !== ContentRefreshWorkflowStatus.REFRESHED) {
                acc.overdue += 1;
            }
            if (row.lastRefreshedAt && new Date(row.lastRefreshedAt) >= addDays(now, -30)) {
                acc.recentlyRefreshed += 1;
            }

            return acc;
        },
        {
            total: rows.length,
            urgent: 0,
            monitor: 0,
            healthy: 0,
            needsRefresh: 0,
            inProgress: 0,
            refreshed: 0,
            stale90: 0,
            stale180: 0,
            timeSensitive: 0,
            overdue: 0,
            recentlyRefreshed: 0,
        }
    );

    const calendarEvents: Array<{
        type: "scheduled" | "overdue" | "refreshed";
        articleId: string;
        title: string;
        slug: string | null;
        date: string;
        refreshStatus: ContentRefreshWorkflowStatus;
    }> = [];

    for (const row of rows) {
        if (row.nextRefreshDueAt) {
            const dueDate = new Date(row.nextRefreshDueAt);
            const overdue = dueDate < now && row.refreshStatus !== ContentRefreshWorkflowStatus.REFRESHED;
            calendarEvents.push({
                type: overdue ? "overdue" : "scheduled",
                articleId: row.articleId,
                title: row.title,
                slug: row.slug,
                date: toIsoDate(dueDate),
                refreshStatus: row.refreshStatus,
            });
        }

        if (row.lastRefreshedAt) {
            const refreshedDate = new Date(row.lastRefreshedAt);
            if (refreshedDate >= addDays(now, -45)) {
                calendarEvents.push({
                    type: "refreshed",
                    articleId: row.articleId,
                    title: row.title,
                    slug: row.slug,
                    date: toIsoDate(refreshedDate),
                    refreshStatus: row.refreshStatus,
                });
            }
        }
    }

    calendarEvents.sort((a, b) => a.date.localeCompare(b.date));

    return {
        generatedAt: now.toISOString(),
        lastDetectionAt: latestSnapshot?.createdAt?.toISOString() || null,
        staleDetectionDays: Number.isFinite(staleDays) ? staleDays : null,
        autoDetectionRan: Boolean(autoDetectionResult),
        autoDetectionResult,
        totals,
        rows,
        recentHistory,
        calendarEvents,
        cadenceGuidance: [
            {
                pageType: "State Pages",
                cadence: "Quarterly",
                rationale: "State regulations and telehealth logistics can change frequently.",
            },
            {
                pageType: "HSA / Financial Content",
                cadence: "Whenever policy changes (minimum quarterly)",
                rationale: "Tax and eligibility rules are time-sensitive and year-dependent.",
            },
            {
                pageType: "Evergreen Learn Content",
                cadence: "Every 6 months",
                rationale: "Maintain topical authority and prevent slow ranking decay.",
            },
        ],
    };
}

export async function getArticleRefreshDetail(articleId: string) {
    const article = await prisma.article.findUnique({
        where: { id: articleId },
        select: {
            id: true,
            title: true,
            slug: true,
            category: true,
            status: true,
            content: true,
            refreshRequested: true,
            refreshStatus: true,
            refreshStatusUpdatedAt: true,
            nextRefreshDueAt: true,
            lastRefreshedAt: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!article) return null;

    const [latestSnapshot, briefs, history] = await Promise.all([
        prisma.contentRefreshSnapshot.findFirst({
            where: { articleId },
            orderBy: { createdAt: "desc" },
        }),
        prisma.contentRefreshBrief.findMany({
            where: { articleId },
            orderBy: [{ createdAt: "desc" }],
            take: 10,
        }),
        prisma.contentRefreshHistory.findMany({
            where: { articleId },
            orderBy: [{ createdAt: "desc" }],
            take: 30,
        }),
    ]);

    const lastTouched = article.lastRefreshedAt && article.lastRefreshedAt > article.updatedAt
        ? article.lastRefreshedAt
        : article.updatedAt;
    const freshDays = latestSnapshot?.freshnessDays ?? freshnessDays(lastTouched);
    const timeSensitive = latestSnapshot
        ? {
            isTimeSensitive: latestSnapshot.isTimeSensitive,
            reasons: Array.isArray(latestSnapshot.timeSensitiveReasons)
                ? latestSnapshot.timeSensitiveReasons.map((x) => String(x || "")).filter(Boolean)
                : [],
        }
        : detectTimeSensitive({
            title: article.title,
            excerpt: null,
            metaTitle: null,
            content: article.content,
            category: article.category,
        });

    return {
        article: {
            ...article,
            refreshStatusUpdatedAt: article.refreshStatusUpdatedAt.toISOString(),
            nextRefreshDueAt: article.nextRefreshDueAt ? article.nextRefreshDueAt.toISOString() : null,
            lastRefreshedAt: article.lastRefreshedAt ? article.lastRefreshedAt.toISOString() : null,
            createdAt: article.createdAt.toISOString(),
            updatedAt: article.updatedAt.toISOString(),
            freshnessDays: freshDays,
            stale90: latestSnapshot?.stale90 ?? freshDays > 90,
            stale180: latestSnapshot?.stale180 ?? freshDays > 180,
            timeSensitive: timeSensitive.isTimeSensitive,
            timeSensitiveReasons: timeSensitive.reasons,
        },
        latestSnapshot: latestSnapshot
            ? {
                ...latestSnapshot,
                periodCurrentStart: latestSnapshot.periodCurrentStart.toISOString(),
                periodCurrentEnd: latestSnapshot.periodCurrentEnd.toISOString(),
                periodPreviousStart: latestSnapshot.periodPreviousStart.toISOString(),
                periodPreviousEnd: latestSnapshot.periodPreviousEnd.toISOString(),
                createdAt: latestSnapshot.createdAt.toISOString(),
                queryOpportunities: Array.isArray(latestSnapshot.queryOpportunities)
                    ? latestSnapshot.queryOpportunities
                    : [],
                timeSensitiveReasons: Array.isArray(latestSnapshot.timeSensitiveReasons)
                    ? latestSnapshot.timeSensitiveReasons
                    : [],
            }
            : null,
        latestBrief: briefs[0]
            ? {
                ...briefs[0],
                createdAt: briefs[0].createdAt.toISOString(),
                updatedAt: briefs[0].updatedAt.toISOString(),
            }
            : null,
        briefs: briefs.map((brief) => ({
            ...brief,
            createdAt: brief.createdAt.toISOString(),
            updatedAt: brief.updatedAt.toISOString(),
        })),
        history: history.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
        })),
    };
}

export async function generateArticleRefreshBrief(input: {
    articleId: string;
    actorUserId?: string | null;
}) {
    const article = await prisma.article.findUnique({
        where: { id: input.articleId },
        select: {
            id: true,
            title: true,
            slug: true,
            content: true,
            excerpt: true,
            category: true,
            metaTitle: true,
            status: true,
            refreshRequested: true,
            refreshStatus: true,
            refreshStatusUpdatedAt: true,
            nextRefreshDueAt: true,
            lastRefreshedAt: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!article) throw new Error("Article not found");

    const latestSnapshot = await prisma.contentRefreshSnapshot.findFirst({
        where: { articleId: article.id },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            classification: true,
            currentClicks: true,
            previousClicks: true,
            currentImpressions: true,
            previousImpressions: true,
            currentAvgPosition: true,
            previousAvgPosition: true,
            clicksDeltaPct: true,
            impressionsDeltaPct: true,
            avgPositionDelta: true,
            queryOpportunities: true,
        },
    });

    const paths = articlePathVariants(article);
    const queryRows = await prisma.searchConsolePageQueryDaily.findMany({
        where: {
            page: { in: paths },
            metricDate: {
                gte: addDays(utcDay(new Date()), -90),
                lte: utcDay(new Date()),
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

    const opportunities = buildQueryOpportunities(
        queryRows.map((row) => ({
            metricDate: utcDay(new Date(row.metricDate)),
            page: normalizePath(row.page),
            query: compactWhitespace(row.query || "").toLowerCase(),
            impressions: Number(row.impressions || 0),
            clicks: Number(row.clicks || 0),
            position: Number(row.position || 0),
        }))
    );

    const newerArticles = await prisma.article.findMany({
        where: {
            id: { not: article.id },
            status: "PUBLISHED",
            slug: { not: null },
            createdAt: { gt: article.createdAt },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
            title: true,
            slug: true,
        },
    });

    const internalLinks = newerArticles
        .filter((x): x is { title: string; slug: string } => Boolean(x.slug))
        .map((x) => ({ label: x.title, url: `/learn/${x.slug}` }))
        .slice(0, 20);

    const generated = await generateRefreshBriefWithLlm({
        article,
        snapshot: latestSnapshot,
        queryOpportunities: opportunities,
        internalLinks,
    });

    const briefMarkdown = briefPayloadToMarkdown(generated.payload);

    const created = await prisma.contentRefreshBrief.create({
        data: {
            articleId: article.id,
            snapshotId: latestSnapshot?.id || null,
            status: "DRAFT",
            briefMarkdown,
            recommendationsJson: generated.payload as any,
            prompt: buildRefreshBriefPrompt({
                article,
                snapshot: latestSnapshot,
                queryOpportunities: opportunities,
                internalLinks,
            }),
            response: generated.responseText,
            provider: generated.provider,
            model: generated.model,
            createdByUserId: input.actorUserId || null,
        },
    });

    await prisma.contentRefreshHistory.create({
        data: {
            articleId: article.id,
            eventType: ContentRefreshHistoryType.BRIEF_GENERATED,
            summary: "Generated refresh brief from current article and Search Console context.",
            details: {
                briefId: created.id,
                provider: generated.provider,
                model: generated.model,
                snapshotId: latestSnapshot?.id || null,
            },
            createdByUserId: input.actorUserId || null,
        },
    });

    if (article.refreshStatus !== ContentRefreshWorkflowStatus.REFRESH_IN_PROGRESS) {
        await prisma.article.update({
            where: { id: article.id },
            data: {
                refreshRequested: true,
                refreshStatus: ContentRefreshWorkflowStatus.NEEDS_REFRESH,
                refreshStatusUpdatedAt: new Date(),
            },
        });
    }

    return {
        brief: {
            ...created,
            createdAt: created.createdAt.toISOString(),
            updatedAt: created.updatedAt.toISOString(),
        },
        payload: generated.payload,
        provider: generated.provider,
        model: generated.model,
    };
}

export async function updateArticleRefreshWorkflow(input: {
    articleId: string;
    actorUserId?: string | null;
    status?: ContentRefreshWorkflowStatus | null;
    nextRefreshDueAt?: Date | null;
    note?: string | null;
    markRefreshedSummary?: string | null;
}) {
    const article = await prisma.article.findUnique({
        where: { id: input.articleId },
        select: {
            id: true,
            title: true,
            slug: true,
            category: true,
            content: true,
            refreshStatus: true,
            refreshRequested: true,
            nextRefreshDueAt: true,
            lastRefreshedAt: true,
            updatedAt: true,
        },
    });

    if (!article) throw new Error("Article not found");

    const nextStatus = input.status || null;

    const updateData: Prisma.ArticleUpdateInput = {};

    if (nextStatus) {
        updateData.refreshStatus = nextStatus;
        updateData.refreshStatusUpdatedAt = new Date();

        if (nextStatus === ContentRefreshWorkflowStatus.NEEDS_REFRESH) {
            updateData.refreshRequested = true;
        }

        if (nextStatus === ContentRefreshWorkflowStatus.REFRESH_IN_PROGRESS) {
            updateData.refreshRequested = true;
        }

        if (nextStatus === ContentRefreshWorkflowStatus.REFRESHED) {
            const now = new Date();
            const sensitivity = detectTimeSensitive({
                title: article.title,
                excerpt: null,
                metaTitle: null,
                content: article.content,
                category: article.category,
            });
            updateData.refreshRequested = false;
            updateData.lastRefreshedAt = now;
            updateData.nextRefreshDueAt = addDays(now, cadenceDays({ category: article.category }, sensitivity));
        }
    }

    if (input.nextRefreshDueAt !== undefined) {
        updateData.nextRefreshDueAt = input.nextRefreshDueAt;
    }

    const updatedArticle = await prisma.article.update({
        where: { id: article.id },
        data: updateData,
    });

    let safetyReview: Awaited<ReturnType<typeof runArticleSafetyCheck>> | null = null;
    let repurposeResult: Awaited<ReturnType<typeof generateArticleRepurpose>> | null = null;

    if (nextStatus === ContentRefreshWorkflowStatus.REFRESHED) {
        try {
            safetyReview = await runArticleSafetyCheck({
                articleId: article.id,
                trigger: "MANUAL",
                actorUserId: input.actorUserId || null,
            });
        } catch (error) {
            console.error("[content-refresh] safety re-run failed", error);
        }

        try {
            repurposeResult = await generateArticleRepurpose({
                articleId: article.id,
                mode: "ALL",
                trigger: "MANUAL_REGENERATE",
                actorUserId: input.actorUserId || null,
                force: true,
            });
        } catch (error) {
            console.error("[content-refresh] repurpose re-run failed", error);
        }
    }

    if (nextStatus && nextStatus !== article.refreshStatus) {
        await prisma.contentRefreshHistory.create({
            data: {
                articleId: article.id,
                eventType:
                    nextStatus === ContentRefreshWorkflowStatus.REFRESHED
                        ? ContentRefreshHistoryType.REFRESH_COMPLETED
                        : ContentRefreshHistoryType.STATUS_CHANGE,
                fromStatus: article.refreshStatus,
                toStatus: nextStatus,
                summary:
                    nextStatus === ContentRefreshWorkflowStatus.REFRESHED
                        ? input.markRefreshedSummary
                            ? `Refresh completed: ${input.markRefreshedSummary}`
                            : "Refresh completed and follow-up checks were triggered."
                        : `Refresh workflow status updated to ${nextStatus}.`,
                details: {
                    note: input.note || null,
                    safetySummary: safetyReview ? summarizeReview(safetyReview) : null,
                    repurposeGeneratedAt: repurposeResult?.asset?.lastGeneratedAt || null,
                },
                createdByUserId: input.actorUserId || null,
            },
        });
    } else if (input.note) {
        await prisma.contentRefreshHistory.create({
            data: {
                articleId: article.id,
                eventType: ContentRefreshHistoryType.STATUS_CHANGE,
                fromStatus: article.refreshStatus,
                toStatus: article.refreshStatus,
                summary: `Refresh note added: ${input.note}`,
                details: {
                    note: input.note,
                },
                createdByUserId: input.actorUserId || null,
            },
        });
    }

    return {
        article: {
            ...updatedArticle,
            refreshStatusUpdatedAt: updatedArticle.refreshStatusUpdatedAt.toISOString(),
            nextRefreshDueAt: updatedArticle.nextRefreshDueAt ? updatedArticle.nextRefreshDueAt.toISOString() : null,
            lastRefreshedAt: updatedArticle.lastRefreshedAt ? updatedArticle.lastRefreshedAt.toISOString() : null,
            updatedAt: updatedArticle.updatedAt.toISOString(),
        },
        safetyReview: safetyReview
            ? {
                id: safetyReview.id,
                summary: summarizeReview(safetyReview),
            }
            : null,
        repurpose: repurposeResult
            ? {
                assetId: repurposeResult.asset.id,
                lastGeneratedAt: repurposeResult.asset.lastGeneratedAt
                    ? repurposeResult.asset.lastGeneratedAt.toISOString()
                    : null,
                skipped: repurposeResult.skipped,
                mode: repurposeResult.mode,
            }
            : null,
    };
}

export function parseRefreshWorkflowStatus(value: unknown) {
    return toRefreshWorkflowStatus(value);
}

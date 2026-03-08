import crypto from "crypto";

import OpenAI from "openai";
import { ContentSafetyReviewStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type SafetySeverity = "MUST_FIX" | "REVIEW_RECOMMENDED" | "SUGGESTION";
export type SafetyCategory =
    | "OVERPROMISING_OUTCOMES"
    | "DIAGNOSING_LANGUAGE"
    | "TREATMENT_RECOMMENDATION"
    | "MISSING_DISCLAIMER"
    | "UNSUPPORTED_CLAIM"
    | "SCOPE_OF_PRACTICE"
    | "URGENCY_LANGUAGE"
    | "STATE_LEGAL_CONCERN"
    | "OTHER";

export type ContentSafetyFlag = {
    id: string;
    severity: SafetySeverity;
    category: SafetyCategory;
    flaggedText: string;
    reason: string;
    suggestedFix: string;
    stateConcern?: string;
    citationNeeded?: boolean;
    reviewedApproved?: boolean;
    reviewedNote?: string;
    reviewedByUserId?: string;
    reviewedAt?: string;
};

export type ContentSafetySummary = {
    issueCount: number;
    mustFixCount: number;
    reviewCount: number;
    suggestionCount: number;
    unresolvedMustFixCount: number;
};

export type DisclaimerTemplate = {
    key: string;
    title: string;
    text: string;
    category: "general" | "financial" | "state";
};

type ArticleSafetyInput = {
    articleId: string;
    title: string;
    slug: string | null;
    category: string | null;
    content: string;
};

type LlmGenerationResult = {
    provider: "claude" | "openai" | "heuristic";
    model: string;
    responseText: string;
    parsed: any;
};

type RunSafetyCheckOptions = {
    articleId: string;
    trigger: "AUTO_READY_FOR_REVIEW" | "MANUAL" | "PUBLISH_PRECHECK";
    actorUserId?: string | null;
    articleOverride?: {
        title: string;
        slug: string | null;
        category: string | null;
        content: string;
    };
};

type PublishSafetyOptions = {
    articleId: string;
    actorUserId?: string | null;
    overrideReason?: string | null;
    articleDraft: {
        title: string;
        slug: string | null;
        category: string | null;
        content: string;
    };
};

const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

const BASE_DISCLAIMER_LIBRARY: DisclaimerTemplate[] = [
    {
        key: "GENERAL_MEDICAL",
        title: "General medical disclaimer",
        text: "This content is for educational purposes only and is not medical advice. It does not replace care from a licensed clinician.",
        category: "general",
    },
    {
        key: "EMERGENCY_NOT_SUBSTITUTE",
        title: "Not a substitute for emergency care",
        text: "Present Health does not provide emergency care. If you are experiencing a medical emergency, call 911 or go to the nearest emergency room.",
        category: "general",
    },
    {
        key: "CONSULT_PERSONAL_PHYSICIAN",
        title: "Consult your physician for personalized advice",
        text: "Always consult your physician or another qualified healthcare professional for diagnosis and treatment recommendations specific to your health needs.",
        category: "general",
    },
    {
        key: "HSA_FINANCIAL",
        title: "Tax/financial disclaimer",
        text: "This content provides general information only and is not tax or financial advice. Consult a qualified tax professional for guidance about your specific situation.",
        category: "financial",
    },
    {
        key: "RESULTS_MAY_VARY",
        title: "Results may vary",
        text: "Outcomes vary by individual, and no specific result is guaranteed.",
        category: "general",
    },
];

function compactWhitespace(value: string) {
    return value.trim().replace(/\s+/g, " ");
}

function hashContent(content: string) {
    return crypto.createHash("sha256").update(content).digest("hex");
}

function parseJsonObject(text: string) {
    const raw = String(text || "").trim();
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
    } catch {
        // continue
    }

    const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
        try {
            const parsed = JSON.parse(fenced[1]);
            if (parsed && typeof parsed === "object") return parsed;
        } catch {
            // continue
        }
    }

    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
        try {
            const parsed = JSON.parse(raw.slice(start, end + 1));
            if (parsed && typeof parsed === "object") return parsed;
        } catch {
            return null;
        }
    }

    return null;
}

function normalizeSeverity(input: unknown): SafetySeverity {
    const raw = String(input || "").trim().toUpperCase();
    if (raw === "MUST_FIX" || raw === "RED" || raw === "CRITICAL") return "MUST_FIX";
    if (raw === "SUGGESTION" || raw === "GREEN" || raw === "LOW") return "SUGGESTION";
    return "REVIEW_RECOMMENDED";
}

function normalizeCategory(input: unknown): SafetyCategory {
    const raw = String(input || "").trim().toUpperCase();
    if (raw === "OVERPROMISING_OUTCOMES") return "OVERPROMISING_OUTCOMES";
    if (raw === "DIAGNOSING_LANGUAGE") return "DIAGNOSING_LANGUAGE";
    if (raw === "TREATMENT_RECOMMENDATION") return "TREATMENT_RECOMMENDATION";
    if (raw === "MISSING_DISCLAIMER") return "MISSING_DISCLAIMER";
    if (raw === "UNSUPPORTED_CLAIM") return "UNSUPPORTED_CLAIM";
    if (raw === "SCOPE_OF_PRACTICE") return "SCOPE_OF_PRACTICE";
    if (raw === "URGENCY_LANGUAGE") return "URGENCY_LANGUAGE";
    if (raw === "STATE_LEGAL_CONCERN") return "STATE_LEGAL_CONCERN";
    return "OTHER";
}

function parseFlags(value: unknown): ContentSafetyFlag[] {
    if (!Array.isArray(value)) return [];

    const flags: ContentSafetyFlag[] = [];
    for (let i = 0; i < value.length; i += 1) {
        const item = value[i];
        if (!item || typeof item !== "object") continue;

        const obj = item as Record<string, unknown>;
        const flaggedText = compactWhitespace(String(obj.flaggedText || obj.text || ""));
        const reason = compactWhitespace(String(obj.reason || ""));
        const suggestedFix = compactWhitespace(String(obj.suggestedFix || obj.fix || ""));

        if (!flaggedText || !reason) continue;

        const idRaw = compactWhitespace(String(obj.id || ""));
        const id = idRaw || `flag-${i + 1}`;

        flags.push({
            id,
            severity: normalizeSeverity(obj.severity),
            category: normalizeCategory(obj.category),
            flaggedText,
            reason,
            suggestedFix: suggestedFix || "Revise this passage to remove personalized guidance and keep educational framing.",
            stateConcern: compactWhitespace(String(obj.stateConcern || "")) || undefined,
            citationNeeded: Boolean(obj.citationNeeded),
            reviewedApproved: Boolean(obj.reviewedApproved),
            reviewedNote: compactWhitespace(String(obj.reviewedNote || "")) || undefined,
            reviewedByUserId: compactWhitespace(String(obj.reviewedByUserId || "")) || undefined,
            reviewedAt: compactWhitespace(String(obj.reviewedAt || "")) || undefined,
        });
    }

    return flags;
}

function summarizeFlags(flags: ContentSafetyFlag[]): ContentSafetySummary {
    const mustFixFlags = flags.filter((x) => x.severity === "MUST_FIX");
    const reviewFlags = flags.filter((x) => x.severity === "REVIEW_RECOMMENDED");
    const suggestionFlags = flags.filter((x) => x.severity === "SUGGESTION");
    const unresolvedMustFixCount = mustFixFlags.filter((x) => !x.reviewedApproved).length;

    return {
        issueCount: flags.length,
        mustFixCount: mustFixFlags.length,
        reviewCount: reviewFlags.length,
        suggestionCount: suggestionFlags.length,
        unresolvedMustFixCount,
    };
}

function normalizeActiveStateNames(value: unknown) {
    if (!Array.isArray(value)) return [] as string[];
    return value.map((x) => compactWhitespace(String(x || ""))).filter(Boolean);
}

function buildStateDisclaimers(stateNames: string[]): DisclaimerTemplate[] {
    return stateNames.map((state) => ({
        key: `STATE_${state.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
        title: `${state} telehealth disclaimer`,
        text: `Telehealth services in ${state} are subject to state-specific licensing, advertising, and prescribing requirements. Service availability and care workflows may vary based on current state law.`,
        category: "state",
    }));
}

export async function getDisclaimerLibrary(): Promise<DisclaimerTemplate[]> {
    const rows = await prisma.state.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        take: 50,
        select: { name: true },
    });

    const stateNames = normalizeActiveStateNames(rows.map((x) => x.name));
    return [...BASE_DISCLAIMER_LIBRARY, ...buildStateDisclaimers(stateNames)];
}

function buildSafetyPrompt(article: ArticleSafetyInput, stateNames: string[]) {
    const stateLine = stateNames.length
        ? `Active states for this clinic: ${stateNames.join(", ")}.`
        : "State coverage may vary; flag any broad legal claims as state concern risks.";

    return [
        "You are a healthcare YMYL safety reviewer for Present Health website content.",
        "Analyze the article draft for patient safety, legal/compliance risk, and overclaiming.",
        "Return STRICT JSON only.",
        "",
        "Check for:",
        "- overpromising outcomes",
        "- diagnosing language",
        "- treatment recommendations that should only come from a physician (prescribing medications, specific supplement dosages, or individual treatment plans — NOT general wellness/fitness education like exercise guidelines, dietary patterns, or widely-published public health recommendations such as CDC/WHO activity guidelines)",
        "- missing disclaimers",
        "- claims without citations",
        "- scope-of-practice issues (implying DPC replaces emergency/specialty care)",
        "- inappropriate urgency language",
        "- state-specific legal concerns for telehealth advertising",
        "",
        stateLine,
        "",
        `Article title: ${article.title}`,
        `Article slug: ${article.slug || "(none)"}`,
        `Article category: ${article.category || "(none)"}`,
        "",
        "Article content:",
        article.content,
        "",
        "Output JSON shape:",
        JSON.stringify(
            {
                flags: [
                    {
                        id: "flag-1",
                        severity: "MUST_FIX",
                        category: "OVERPROMISING_OUTCOMES",
                        flaggedText: "...exact problematic passage...",
                        reason: "Why it is risky",
                        suggestedFix: "Safer alternative wording",
                        citationNeeded: true,
                        stateConcern: "Optional state-specific concern",
                    },
                ],
            },
            null,
            2
        ),
        "",
        "Severity rules:",
        "- MUST_FIX: publication should be blocked until fixed or explicitly overridden",
        "- REVIEW_RECOMMENDED: should be reviewed by editor/clinician",
        "- SUGGESTION: optional improvement",
    ].join("\n");
}

async function callClaude(prompt: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!apiKey) return null;

    const model = process.env.CONTENT_SAFETY_ANTHROPIC_MODEL || DEFAULT_CLAUDE_MODEL;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model,
            max_tokens: 3200,
            temperature: 0,
            messages: [{ role: "user", content: prompt }],
        }),
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Claude safety request failed (${res.status}): ${detail || "unknown error"}`);
    }

    const data = (await res.json().catch(() => null)) as any;
    const text = Array.isArray(data?.content)
        ? data.content
            .map((part: any) => (part?.type === "text" && typeof part?.text === "string" ? part.text : ""))
            .join("\n")
            .trim()
        : "";

    return { model, text: text || "" };
}

async function callOpenAi(prompt: string) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    const model = process.env.CONTENT_SAFETY_OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
        model,
        temperature: 0,
        max_tokens: 2600,
        messages: [
            {
                role: "system",
                content: "You are a healthcare YMYL safety reviewer. Return JSON only.",
            },
            { role: "user", content: prompt },
        ],
    });

    const text = response.choices[0]?.message?.content?.trim() || "";
    return { model, text };
}

function heuristicAnalyze(article: ArticleSafetyInput) {
    const flags: ContentSafetyFlag[] = [];
    const content = article.content || "";

    function addFlag(flag: Omit<ContentSafetyFlag, "id">) {
        const id = `flag-${flags.length + 1}`;
        flags.push({ id, ...flag });
    }

    const patterns: Array<{
        regex: RegExp;
        severity: SafetySeverity;
        category: SafetyCategory;
        reason: string;
        suggestedFix: string;
    }> = [
        {
            regex: /\b(cure|guaranteed results?|guarantee[d]?|always works|never fails?)\b/gi,
            severity: "MUST_FIX",
            category: "OVERPROMISING_OUTCOMES",
            reason: "This language overpromises outcomes, which is risky for healthcare YMYL content.",
            suggestedFix: "Use probabilistic, non-guaranteed language and clarify that outcomes vary by individual.",
        },
        {
            regex: /\b(you likely have|this means you have|you definitely have)\b/gi,
            severity: "MUST_FIX",
            category: "DIAGNOSING_LANGUAGE",
            reason: "This appears to diagnose readers based on text content.",
            suggestedFix: "Replace with educational context and advise consultation with a licensed clinician for diagnosis.",
        },
        {
            regex: /\b(you should take|start taking|stop taking|(?:recommended |daily |maximum |mg |medication )(?:dose|dosage))\b/gi,
            severity: "MUST_FIX",
            category: "TREATMENT_RECOMMENDATION",
            reason: "This can be interpreted as direct treatment guidance.",
            suggestedFix: "Use neutral educational language and instruct readers to consult their physician for individualized treatment.",
        },
        {
            regex: /\b(no need for specialists?|replaces specialists?|no need for emergency care|instead of the ER)\b/gi,
            severity: "MUST_FIX",
            category: "SCOPE_OF_PRACTICE",
            reason: "This may imply DPC replaces emergency or specialty care.",
            suggestedFix: "Clarify DPC scope and explicitly state that emergency/specialty care may still be necessary.",
        },
        {
            regex: /\b(you must see a doctor immediately|act now or else|immediately or your condition)\b/gi,
            severity: "REVIEW_RECOMMENDED",
            category: "URGENCY_LANGUAGE",
            reason: "Urgency framing may be overly directive and requires careful phrasing.",
            suggestedFix: "Use symptom-based emergency guidance language and avoid alarmist claims.",
        },
        {
            regex: /\b(study shows|studies show|\d+%|\d+ percent|according to research)\b/gi,
            severity: "REVIEW_RECOMMENDED",
            category: "UNSUPPORTED_CLAIM",
            reason: "This may require a citation or source attribution.",
            suggestedFix: "Add a reliable source citation or remove unsupported quantitative claims.",
        },
    ];

    for (const pattern of patterns) {
        let match: RegExpExecArray | null;
        const clone = new RegExp(pattern.regex.source, pattern.regex.flags);
        while ((match = clone.exec(content))) {
            const start = Math.max(0, match.index - 60);
            const end = Math.min(content.length, match.index + match[0].length + 80);
            addFlag({
                severity: pattern.severity,
                category: pattern.category,
                flaggedText: compactWhitespace(content.slice(start, end)),
                reason: pattern.reason,
                suggestedFix: pattern.suggestedFix,
                citationNeeded: pattern.category === "UNSUPPORTED_CLAIM",
            });
            if (flags.length >= 24) break;
        }
        if (flags.length >= 24) break;
    }

    const hasDisclaimer = /not medical advice|educational purposes only|consult your physician|medical emergency/i.test(
        content
    );
    if (!hasDisclaimer) {
        addFlag({
            severity: "REVIEW_RECOMMENDED",
            category: "MISSING_DISCLAIMER",
            flaggedText: compactWhitespace(content.slice(0, Math.min(content.length, 220))),
            reason: "No clear medical/educational disclaimer detected in the article body.",
            suggestedFix:
                "Insert a disclaimer clarifying this content is educational and not a substitute for personalized medical advice.",
        });
    }

    return {
        provider: "heuristic" as const,
        model: "heuristic-v1",
        responseText: JSON.stringify({ flags }, null, 2),
        parsed: { flags },
    };
}

async function runLlmSafety(prompt: string): Promise<LlmGenerationResult> {
    try {
        const claude = await callClaude(prompt);
        if (claude?.text) {
            const parsed = parseJsonObject(claude.text);
            if (parsed) {
                return {
                    provider: "claude",
                    model: claude.model,
                    responseText: claude.text,
                    parsed,
                };
            }
        }
    } catch (error) {
        console.error("[content-safety] Claude analysis failed", error);
    }

    try {
        const openAi = await callOpenAi(prompt);
        if (openAi?.text) {
            const parsed = parseJsonObject(openAi.text);
            if (parsed) {
                return {
                    provider: "openai",
                    model: openAi.model,
                    responseText: openAi.text,
                    parsed,
                };
            }
        }
    } catch (error) {
        console.error("[content-safety] OpenAI analysis failed", error);
    }

    return { provider: "heuristic", model: "heuristic-v1", responseText: "", parsed: null };
}

async function loadArticleSafetyInput(options: RunSafetyCheckOptions): Promise<ArticleSafetyInput> {
    if (options.articleOverride) {
        return {
            articleId: options.articleId,
            title: options.articleOverride.title,
            slug: options.articleOverride.slug,
            category: options.articleOverride.category,
            content: options.articleOverride.content,
        };
    }

    const article = await prisma.article.findUnique({
        where: { id: options.articleId },
        select: { id: true, title: true, slug: true, category: true, content: true },
    });

    if (!article) throw new Error("Article not found");

    return {
        articleId: article.id,
        title: article.title,
        slug: article.slug,
        category: article.category,
        content: article.content || "",
    };
}

export function reviewStatusLabel(status: ContentSafetyReviewStatus) {
    if (status === ContentSafetyReviewStatus.OVERRIDDEN) return "OVERRIDDEN";
    if (status === ContentSafetyReviewStatus.NEEDS_FIX) return "NEEDS_FIX";
    return "PASS";
}

export async function runArticleSafetyCheck(options: RunSafetyCheckOptions) {
    const article = await loadArticleSafetyInput(options);
    const contentHash = hashContent(article.content || "");
    const states = await prisma.state.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { name: true },
        take: 25,
    });
    const stateNames = normalizeActiveStateNames(states.map((x) => x.name));

    const prompt = buildSafetyPrompt(article, stateNames);
    const generation = await runLlmSafety(prompt);

    const fallback = heuristicAnalyze(article);
    const parsedFlags = parseFlags(generation.parsed?.flags);
    const flags = parsedFlags.length ? parsedFlags : parseFlags(fallback.parsed?.flags);
    const responseText = generation.responseText || fallback.responseText;
    const provider = parsedFlags.length ? generation.provider : fallback.provider;
    const model = parsedFlags.length ? generation.model : fallback.model;

    const summary = summarizeFlags(flags);
    const status =
        summary.unresolvedMustFixCount > 0
            ? ContentSafetyReviewStatus.NEEDS_FIX
            : ContentSafetyReviewStatus.PASS;

    const review = await prisma.contentSafetyReview.create({
        data: {
            articleId: article.articleId,
            trigger: options.trigger,
            provider,
            model,
            status,
            contentHash,
            issueCount: summary.issueCount,
            mustFixCount: summary.mustFixCount,
            reviewCount: summary.reviewCount,
            suggestionCount: summary.suggestionCount,
            unresolvedMustFixCount: summary.unresolvedMustFixCount,
            flags,
            prompt,
            response: responseText,
            createdByUserId: options.actorUserId || null,
        },
    });

    return review;
}

export function parseReviewFlags(review: { flags: unknown }) {
    return parseFlags(review.flags);
}

export function summarizeReview(review: {
    issueCount: number;
    mustFixCount: number;
    reviewCount: number;
    suggestionCount: number;
    unresolvedMustFixCount: number;
}) {
    return {
        issueCount: review.issueCount,
        mustFixCount: review.mustFixCount,
        reviewCount: review.reviewCount,
        suggestionCount: review.suggestionCount,
        unresolvedMustFixCount: review.unresolvedMustFixCount,
    };
}

export async function getLatestSafetyReview(articleId: string) {
    return prisma.contentSafetyReview.findFirst({
        where: { articleId },
        orderBy: [{ createdAt: "desc" }],
    });
}

export async function approveSafetyFlag(options: {
    reviewId: string;
    flagId: string;
    note: string;
    actorUserId?: string | null;
}) {
    const note = compactWhitespace(options.note || "");
    if (!note) throw new Error("Override note is required");

    const review = await prisma.contentSafetyReview.findUnique({ where: { id: options.reviewId } });
    if (!review) throw new Error("Safety review not found");

    const flags = parseFlags(review.flags);
    const target = flags.find((x) => x.id === options.flagId);
    if (!target) throw new Error("Flag not found");

    target.reviewedApproved = true;
    target.reviewedNote = note;
    target.reviewedByUserId = options.actorUserId || undefined;
    target.reviewedAt = new Date().toISOString();

    const history = Array.isArray(review.overrideHistory) ? [...(review.overrideHistory as any[])] : [];
    history.push({
        action: "FLAG_APPROVED",
        flagId: options.flagId,
        note,
        actorUserId: options.actorUserId || null,
        createdAt: new Date().toISOString(),
    });

    const summary = summarizeFlags(flags);
    const status =
        summary.unresolvedMustFixCount > 0
            ? ContentSafetyReviewStatus.NEEDS_FIX
            : summary.mustFixCount > 0
                ? ContentSafetyReviewStatus.OVERRIDDEN
                : ContentSafetyReviewStatus.PASS;

    const updated = await prisma.contentSafetyReview.update({
        where: { id: review.id },
        data: {
            flags,
            overrideHistory: history,
            status,
            issueCount: summary.issueCount,
            mustFixCount: summary.mustFixCount,
            reviewCount: summary.reviewCount,
            suggestionCount: summary.suggestionCount,
            unresolvedMustFixCount: summary.unresolvedMustFixCount,
        },
    });

    await prisma.auditLog.create({
        data: {
            actorUserId: options.actorUserId || null,
            action: "CONTENT_SAFETY_FLAG_APPROVED",
            entityType: "ContentSafetyReview",
            entityId: review.id,
            metadata: {
                reviewId: review.id,
                articleId: review.articleId,
                flagId: options.flagId,
                note,
            },
        },
    });

    return updated;
}

export async function overrideAllMustFix(options: {
    reviewId: string;
    reason: string;
    actorUserId?: string | null;
}) {
    const reason = compactWhitespace(options.reason || "");
    if (!reason) throw new Error("Override reason is required");

    const review = await prisma.contentSafetyReview.findUnique({ where: { id: options.reviewId } });
    if (!review) throw new Error("Safety review not found");

    const flags = parseFlags(review.flags);
    let changed = false;

    for (const flag of flags) {
        if (flag.severity !== "MUST_FIX") continue;
        if (flag.reviewedApproved) continue;
        flag.reviewedApproved = true;
        flag.reviewedNote = reason;
        flag.reviewedByUserId = options.actorUserId || undefined;
        flag.reviewedAt = new Date().toISOString();
        changed = true;
    }

    if (!changed) return review;

    const history = Array.isArray(review.overrideHistory) ? [...(review.overrideHistory as any[])] : [];
    history.push({
        action: "OVERRIDE_ALL_MUST_FIX",
        note: reason,
        actorUserId: options.actorUserId || null,
        createdAt: new Date().toISOString(),
    });

    const summary = summarizeFlags(flags);

    const updated = await prisma.contentSafetyReview.update({
        where: { id: review.id },
        data: {
            flags,
            overrideHistory: history,
            status: summary.mustFixCount > 0 ? ContentSafetyReviewStatus.OVERRIDDEN : ContentSafetyReviewStatus.PASS,
            issueCount: summary.issueCount,
            mustFixCount: summary.mustFixCount,
            reviewCount: summary.reviewCount,
            suggestionCount: summary.suggestionCount,
            unresolvedMustFixCount: summary.unresolvedMustFixCount,
        },
    });

    await prisma.auditLog.create({
        data: {
            actorUserId: options.actorUserId || null,
            action: "CONTENT_SAFETY_OVERRIDE_ALL",
            entityType: "ContentSafetyReview",
            entityId: review.id,
            metadata: {
                reviewId: review.id,
                articleId: review.articleId,
                reason,
            },
        },
    });

    return updated;
}

export async function enforcePublishSafety(options: PublishSafetyOptions) {
    const contentHash = hashContent(options.articleDraft.content || "");

    let review = await prisma.contentSafetyReview.findFirst({
        where: { articleId: options.articleId },
        orderBy: [{ createdAt: "desc" }],
    });

    if (!review || review.contentHash !== contentHash) {
        review = await runArticleSafetyCheck({
            articleId: options.articleId,
            trigger: "PUBLISH_PRECHECK",
            actorUserId: options.actorUserId,
            articleOverride: {
                title: options.articleDraft.title,
                slug: options.articleDraft.slug,
                category: options.articleDraft.category,
                content: options.articleDraft.content,
            },
        });
    }

    const flags = parseFlags(review.flags);
    const summary = summarizeFlags(flags);

    if (summary.unresolvedMustFixCount > 0) {
        const reason = compactWhitespace(options.overrideReason || "");
        if (!reason) {
            return {
                allowed: false,
                review,
                flags,
                summary,
            } as const;
        }

        review = await overrideAllMustFix({
            reviewId: review.id,
            reason,
            actorUserId: options.actorUserId,
        });

        const nextFlags = parseFlags(review.flags);
        const nextSummary = summarizeFlags(nextFlags);

        await prisma.auditLog.create({
            data: {
                actorUserId: options.actorUserId || null,
                action: "CONTENT_SAFETY_PUBLISH_OVERRIDE",
                entityType: "Article",
                entityId: options.articleId,
                metadata: {
                    reviewId: review.id,
                    reason,
                    unresolvedMustFixBeforeOverride: summary.unresolvedMustFixCount,
                },
            },
        });

        return {
            allowed: true,
            review,
            flags: nextFlags,
            summary: nextSummary,
            overrideApplied: true,
        } as const;
    }

    return {
        allowed: true,
        review,
        flags,
        summary,
        overrideApplied: false,
    } as const;
}

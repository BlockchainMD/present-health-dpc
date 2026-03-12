import OpenAI from "openai";
import { ContentBriefIntent, ContentBriefStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

type BriefSectionLink = {
    label: string;
    url: string;
    reason?: string;
};

type BriefSubsection = {
    id: string;
    title: string;
    keyPoints: string[];
    suggestedWordCount: number;
    internalLinkOpportunities: BriefSectionLink[];
};

type BriefSection = {
    id: string;
    h2: string;
    keyPoints: string[];
    suggestedWordCount: number;
    internalLinkOpportunities: BriefSectionLink[];
    h3s: BriefSubsection[];
};

type SafetyFlag = {
    sectionId?: string;
    sectionTitle: string;
    severity: "low" | "medium" | "high";
    concerns: string[];
    detail?: string;
    citationNeededClaims?: string[];
    disclaimerSuggestion?: string;
};

export type BriefGenerationInput = {
    targetKeyword: string;
    searchIntent: ContentBriefIntent;
    targetAudience: string;
    notes?: string | null;
};

export type InternalLinkCandidate = {
    label: string;
    url: string;
    type: "core_page" | "learn_article" | "state_page" | "physician_page";
};

type GeneratedBriefPayload = {
    h1Options: string[];
    metaTitleOptions: string[];
    metaDescriptionOptions: string[];
    urlSlugSuggestion: string;
    outline: BriefSection[];
    semanticKeywords: string[];
    longTailQuestions: string[];
    faqSuggestions: string[];
    differentiationAngle: string;
    recommendedWordCount: number;
    schemaRecommendation: string[];
};

type SafetyPayload = {
    globalWarnings: string[];
    disclaimerSuggestions: string[];
    sectionFlags: SafetyFlag[];
};

const CORE_PAGE_LINKS: InternalLinkCandidate[] = [
    { label: "Homepage", url: "/", type: "core_page" },
    { label: "How it works", url: "/how-it-works", type: "core_page" },
    { label: "Pricing", url: "/pricing", type: "core_page" },
    { label: "Join", url: "/join", type: "core_page" },
    { label: "Our Physicians", url: "/our-physicians", type: "core_page" },
    { label: "States", url: "/states", type: "core_page" },
    { label: "Learn", url: "/learn", type: "core_page" },
    { label: "For Employers", url: "/for-employers", type: "core_page" },
    { label: "About", url: "/about", type: "core_page" },
];

const STOPWORDS = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "what",
    "when",
    "where",
    "why",
    "how",
    "your",
    "you",
    "are",
    "can",
    "will",
    "does",
    "dpc",
    "telehealth",
    "present",
    "health",
    "direct",
    "primary",
    "care",
]);

const DEFAULT_SCHEMA_RECOMMENDATION = ["Article"];
const SAFE_SCHEMA_TYPES = new Set(["Article", "HowTo", "FAQPage"]);

const INTENT_LABELS: Record<ContentBriefIntent, string> = {
    INFORMATIONAL: "Informational",
    TRANSACTIONAL: "Transactional",
    COMMERCIAL: "Commercial",
    NAVIGATIONAL: "Navigational",
};

function compactWhitespace(value: string) {
    return value.trim().replace(/\s+/g, " ");
}

function normalizeStringArray(value: unknown, min = 0, max = 20) {
    let list: string[] = [];
    if (Array.isArray(value)) {
        list = value.map((x) => compactWhitespace(String(x || ""))).filter(Boolean);
    } else if (typeof value === "string") {
        list = value
            .split(/\n|,|;/g)
            .map((x) => compactWhitespace(x))
            .filter(Boolean);
    }

    const unique: string[] = [];
    for (const item of list) {
        if (!unique.includes(item)) unique.push(item);
    }

    const sliced = unique.slice(0, Math.max(0, max));
    if (sliced.length >= min) return sliced;
    return sliced;
}

function normalizeMetaTitle(input: string) {
    const text = compactWhitespace(input);
    if (text.length <= 60) return text;
    return `${text.slice(0, 57).trim()}...`;
}

function normalizeMetaDescription(input: string) {
    const text = compactWhitespace(input);
    if (text.length <= 160) return text;
    return `${text.slice(0, 157).trim()}...`;
}

function parseJsonObject(text: string): any | null {
    const raw = String(text || "").trim();
    if (!raw) return null;

    const direct = (() => {
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    })();
    if (direct && typeof direct === "object") return direct;

    const fencedMatch = raw.match(/```json\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
        try {
            const parsed = JSON.parse(fencedMatch[1].trim());
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

function extractKeywords(text: string) {
    const cleaned = String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const tokens = cleaned.split(" ").map((t) => t.trim()).filter(Boolean);
    const out: string[] = [];

    for (const token of tokens) {
        if (token.length < 4) continue;
        if (STOPWORDS.has(token)) continue;
        if (out.includes(token)) continue;
        out.push(token);
        if (out.length >= 12) break;
    }

    return out;
}

function scoreCandidate(candidate: InternalLinkCandidate, keywords: string[]) {
    if (!keywords.length) return 0;
    const haystack = `${candidate.label} ${candidate.url}`.toLowerCase();
    let score = 0;
    for (const keyword of keywords) {
        if (haystack.includes(keyword)) score += 1;
    }
    return score;
}

function dedupeCandidates(items: InternalLinkCandidate[]) {
    const map = new Map<string, InternalLinkCandidate>();
    for (const item of items) map.set(item.url, item);
    return Array.from(map.values());
}

export function parseContentBriefIntent(value: string | null | undefined): ContentBriefIntent | null {
    const raw = String(value || "").trim().toUpperCase();
    if (!raw) return null;
    if ((Object.values(ContentBriefIntent) as string[]).includes(raw)) return raw as ContentBriefIntent;
    return null;
}

export function parseContentBriefStatus(value: string | null | undefined): ContentBriefStatus | null {
    const raw = String(value || "").trim().toUpperCase();
    if (!raw) return null;
    if ((Object.values(ContentBriefStatus) as string[]).includes(raw)) return raw as ContentBriefStatus;
    return null;
}

export function contentBriefIntentLabel(intent: ContentBriefIntent) {
    return INTENT_LABELS[intent] || intent;
}

async function resolveLinkCandidates(input: BriefGenerationInput): Promise<InternalLinkCandidate[]> {
    const keywords = extractKeywords(`${input.targetKeyword} ${input.targetAudience}`);

    const now = new Date();
    const articleWhere = keywords.length
        ? {
            status: "PUBLISHED" as const,
            slug: { not: null as any },
            OR: [{ publishedAt: null as any }, { publishedAt: { lte: now } }],
            AND: [
                {
                    OR: keywords.flatMap((k) => [
                        { title: { contains: k, mode: "insensitive" as const } },
                        { excerpt: { contains: k, mode: "insensitive" as const } },
                        { category: { contains: k, mode: "insensitive" as const } },
                    ]),
                },
            ],
        }
        : {
            status: "PUBLISHED" as const,
            slug: { not: null as any },
            OR: [{ publishedAt: null as any }, { publishedAt: { lte: now } }],
        };

    const [articles, states, physicians] = await Promise.all([
        prisma.article.findMany({
            where: articleWhere as any,
            orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } as any }, { createdAt: "desc" }],
            take: 30,
            select: { slug: true, title: true },
        }),
        prisma.state.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
            take: 15,
            select: { slug: true, name: true },
        }),
        prisma.physician.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
            take: 20,
            select: { slug: true, name: true },
        }),
    ]);

    const dynamic: InternalLinkCandidate[] = [
        ...articles
            .filter((a) => a.slug)
            .map((a) => ({
                label: a.title,
                url: `/learn/${a.slug}`,
                type: "learn_article" as const,
            })),
        ...states.map((s) => ({ label: `Telehealth in ${s.name}`, url: `/states/${s.slug}`, type: "state_page" as const })),
        ...physicians.map((p) => ({ label: p.name, url: `/our-physicians/${p.slug}`, type: "physician_page" as const })),
    ];

    const combined = dedupeCandidates([...CORE_PAGE_LINKS, ...dynamic]);
    const scored = combined
        .map((candidate) => ({ candidate, score: scoreCandidate(candidate, keywords) }))
        .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.candidate.label.localeCompare(b.candidate.label)));

    return scored.map((row) => row.candidate).slice(0, 40);
}

function normalizeLinks(value: unknown, candidates: InternalLinkCandidate[] | null) {
    const allowedByUrl =
        Array.isArray(candidates) && candidates.length
            ? new Map(candidates.map((x) => [x.url, x]))
            : null;

    const input = Array.isArray(value) ? value : [];
    const links: BriefSectionLink[] = [];

    for (const item of input) {
        if (!item || typeof item !== "object") continue;
        const obj = item as Record<string, unknown>;
        const url = compactWhitespace(String(obj.url || ""));
        if (!url) continue;

        const allowed = allowedByUrl ? allowedByUrl.get(url) : null;
        if (allowedByUrl && !allowed) continue;

        const fallbackLabel = allowed?.label || compactWhitespace(String(obj.label || "")) || url;
        const label = compactWhitespace(String(obj.label || fallbackLabel || "")) || fallbackLabel;
        const reason = compactWhitespace(String(obj.reason || ""));

        links.push({ label, url, reason: reason || undefined });
        if (links.length >= 4) break;
    }

    if (links.length) return links;
    return [];
}

function normalizeOutline(value: unknown, candidates: InternalLinkCandidate[] | null) {
    if (!Array.isArray(value)) return [] as BriefSection[];

    const sections: BriefSection[] = [];

    for (let i = 0; i < value.length; i += 1) {
        const item = value[i];
        if (!item || typeof item !== "object") continue;
        const obj = item as Record<string, unknown>;

        const h2 = compactWhitespace(String(obj.h2 || obj.title || ""));
        if (!h2) continue;

        const keyPoints = normalizeStringArray(obj.keyPoints, 0, 8);
        const suggestedWordCount = (() => {
            const raw = Number.parseInt(String(obj.suggestedWordCount ?? ""), 10);
            if (!Number.isFinite(raw)) return 180;
            return Math.min(500, Math.max(60, raw));
        })();

        const internalLinkOpportunities = normalizeLinks(obj.internalLinkOpportunities, candidates);
        const h3Raw = Array.isArray(obj.h3s) ? obj.h3s : [];
        const h3s: BriefSubsection[] = [];

        for (let j = 0; j < h3Raw.length; j += 1) {
            const child = h3Raw[j];
            if (!child || typeof child !== "object") continue;
            const childObj = child as Record<string, unknown>;
            const title = compactWhitespace(String(childObj.title || childObj.h3 || ""));
            if (!title) continue;

            const childKeyPoints = normalizeStringArray(childObj.keyPoints, 0, 6);
            const childWordCount = (() => {
                const raw = Number.parseInt(String(childObj.suggestedWordCount ?? ""), 10);
                if (!Number.isFinite(raw)) return 110;
                return Math.min(280, Math.max(40, raw));
            })();

            h3s.push({
                id: `section-${i + 1}-h3-${j + 1}`,
                title,
                keyPoints: childKeyPoints,
                suggestedWordCount: childWordCount,
                internalLinkOpportunities: normalizeLinks(childObj.internalLinkOpportunities, candidates),
            });
        }

        sections.push({
            id: `section-${i + 1}`,
            h2,
            keyPoints,
            suggestedWordCount,
            internalLinkOpportunities,
            h3s,
        });

        if (sections.length >= 14) break;
    }

    return sections;
}

function normalizeSchemaRecommendation(value: unknown) {
    const items = normalizeStringArray(value, 0, 4)
        .map((x) => {
            const lower = x.toLowerCase();
            if (lower === "article") return "Article";
            if (lower === "howto" || lower === "how-to") return "HowTo";
            if (lower === "faqpage" || lower === "faq") return "FAQPage";
            return x;
        })
        .filter((x) => SAFE_SCHEMA_TYPES.has(x));

    return items.length ? items : DEFAULT_SCHEMA_RECOMMENDATION;
}

async function callClaude(prompt: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!apiKey) return null;

    const model = process.env.CONTENT_BRIEF_ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model,
            max_tokens: 3500,
            temperature: 0.2,
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
    const model = process.env.CONTENT_BRIEF_OPENAI_MODEL || "gpt-4o-mini";
    const response = await openai.chat.completions.create({
        model,
        temperature: 0.2,
        max_tokens: 3000,
        messages: [
            {
                role: "system",
                content:
                    "You are a senior SEO strategist and medical-content planner. Return valid JSON only with no markdown wrapper.",
            },
            { role: "user", content: prompt },
        ],
    });

    return response.choices[0]?.message?.content?.trim() || null;
}

async function generateLlmJson(prompt: string) {
    try {
        const claudeText = await callClaude(prompt);
        if (claudeText) {
            const parsed = parseJsonObject(claudeText);
            if (parsed) return { parsed, responseText: claudeText, provider: "claude" as const };
        }
    } catch (error) {
        console.error("[content-briefs] Claude generation failed", error);
    }

    try {
        const openAiText = await callOpenAi(prompt);
        if (openAiText) {
            const parsed = parseJsonObject(openAiText);
            if (parsed) return { parsed, responseText: openAiText, provider: "openai" as const };
        }
    } catch (error) {
        console.error("[content-briefs] OpenAI generation failed", error);
    }

    return null;
}

function buildGenerationPrompt(input: BriefGenerationInput, candidates: InternalLinkCandidate[]) {
    const candidateLines = candidates
        .map((c, index) => `${index + 1}. ${c.label} (${c.type}) -> ${c.url}`)
        .join("\n");
    const contextualNotes = compactWhitespace(String(input.notes || ""));

    return [
        "You are creating a publish-ready SEO content brief for Present Health, a telehealth-first Direct Primary Care clinic.",
        "Return valid JSON only. Do not wrap in markdown.",
        "",
        `Target keyword: ${input.targetKeyword}`,
        `Search intent: ${INTENT_LABELS[input.searchIntent]}`,
        `Target audience: ${input.targetAudience}`,
        ...(contextualNotes
            ? [
                "",
                "Additional topic context:",
                contextualNotes,
                "Use that context to understand why the topic matters right now, but turn it into evergreen patient/search intent instead of writing a news recap.",
            ]
            : []),
        "",
        "Output requirements:",
        "- h1Options: exactly 3 options",
        "- metaTitleOptions: exactly 3 options, each 55-60 characters",
        "- metaDescriptionOptions: exactly 3 options, each 150-160 characters",
        "- urlSlugSuggestion: concise lowercase slug",
        "- outline: 5-9 H2 sections. Each section must include keyPoints, suggestedWordCount, internalLinkOpportunities, and optional h3s",
        "- semanticKeywords: 15-20 terms",
        "- longTailQuestions: 5-10 items",
        "- faqSuggestions: 5-8 question-only items",
        "- differentiationAngle: specific strategy to outperform current ranking content",
        "- recommendedWordCount: integer",
        "- schemaRecommendation: array with one or more of [Article, HowTo, FAQPage]",
        "",
        "Internal linking rule:",
        "- Use only links from the candidate list below.",
        "- For each H2 and H3, include up to 2 internal links with reason.",
        "",
        "Candidate internal links:",
        candidateLines,
        "",
        "Return JSON with this exact shape:",
        JSON.stringify(
            {
                h1Options: [""],
                metaTitleOptions: [""],
                metaDescriptionOptions: [""],
                urlSlugSuggestion: "",
                outline: [
                    {
                        h2: "",
                        keyPoints: [""],
                        suggestedWordCount: 180,
                        internalLinkOpportunities: [{ label: "", url: "", reason: "" }],
                        h3s: [
                            {
                                title: "",
                                keyPoints: [""],
                                suggestedWordCount: 100,
                                internalLinkOpportunities: [{ label: "", url: "", reason: "" }],
                            },
                        ],
                    },
                ],
                semanticKeywords: [""],
                longTailQuestions: [""],
                faqSuggestions: [""],
                differentiationAngle: "",
                recommendedWordCount: 1400,
                schemaRecommendation: ["Article", "FAQPage"],
            },
            null,
            2
        ),
    ].join("\n");
}

function normalizeGeneratedBrief(
    parsed: any,
    input: BriefGenerationInput,
    candidates: InternalLinkCandidate[]
): GeneratedBriefPayload {
    const h1Options = normalizeStringArray(parsed?.h1Options, 0, 3);
    const h1Filled = h1Options.length ? h1Options : [
        `${input.targetKeyword}: What You Should Know`,
        `${input.targetKeyword}: A Practical Guide`,
        `Understanding ${input.targetKeyword}`,
    ];

    const metaTitleOptions = normalizeStringArray(parsed?.metaTitleOptions, 0, 3).map(normalizeMetaTitle);
    const metaTitles = metaTitleOptions.length
        ? metaTitleOptions
        : [
            normalizeMetaTitle(`${input.targetKeyword} Guide | Present Health`),
            normalizeMetaTitle(`${input.targetKeyword}: What to Know | Present Health`),
            normalizeMetaTitle(`${input.targetKeyword} FAQ | Present Health`),
        ];

    const metaDescriptionOptions = normalizeStringArray(parsed?.metaDescriptionOptions, 0, 3).map(
        normalizeMetaDescription
    );
    const metaDescriptions = metaDescriptionOptions.length
        ? metaDescriptionOptions
        : [
            normalizeMetaDescription(
                `Learn how ${input.targetKeyword} works, what to expect, and when telehealth DPC may help. Present Health explains the essentials in plain language.`
            ),
            normalizeMetaDescription(
                `A clear breakdown of ${input.targetKeyword} for ${input.targetAudience}. Practical steps, FAQs, and links to pricing and how Present Health works.`
            ),
            normalizeMetaDescription(
                `Present Health's guide to ${input.targetKeyword}: key facts, common questions, and how telehealth-first primary care supports ongoing care.`
            ),
        ];

    const outline = normalizeOutline(parsed?.outline, candidates);

    const semanticKeywords = normalizeStringArray(parsed?.semanticKeywords, 0, 24).slice(0, 20);
    const longTailQuestions = normalizeStringArray(parsed?.longTailQuestions, 0, 12).slice(0, 10);
    const faqSuggestions = normalizeStringArray(parsed?.faqSuggestions, 0, 10).slice(0, 8);

    const recommendedWordCount = (() => {
        const raw = Number.parseInt(String(parsed?.recommendedWordCount ?? ""), 10);
        if (!Number.isFinite(raw)) return 1400;
        return Math.min(3200, Math.max(700, raw));
    })();

    const differentiationAngle =
        compactWhitespace(String(parsed?.differentiationAngle || "")) ||
        "Lead with practical decision-making frameworks, clear cost context, and explicit next steps instead of generic symptom lists.";

    const urlSlugSuggestion = slugify(String(parsed?.urlSlugSuggestion || input.targetKeyword || "")) || "content-brief";

    return {
        h1Options: h1Filled.slice(0, 3),
        metaTitleOptions: metaTitles.slice(0, 3),
        metaDescriptionOptions: metaDescriptions.slice(0, 3),
        urlSlugSuggestion,
        outline,
        semanticKeywords,
        longTailQuestions,
        faqSuggestions,
        differentiationAngle,
        recommendedWordCount,
        schemaRecommendation: normalizeSchemaRecommendation(parsed?.schemaRecommendation),
    };
}

function buildSafetyPrompt(input: BriefGenerationInput, brief: GeneratedBriefPayload) {
    const contextualNotes = compactWhitespace(String(input.notes || ""));

    return [
        "You are a medical-content safety reviewer for a marketing content brief.",
        "Return valid JSON only. Do not wrap in markdown.",
        "",
        "Review this outline for:",
        "1) possible medical advice/diagnosis language",
        "2) missing disclaimer suggestions",
        "3) scope-of-practice concerns",
        "4) claims likely requiring clinical citations",
        "",
        `Target keyword: ${input.targetKeyword}`,
        `Intent: ${INTENT_LABELS[input.searchIntent]}`,
        `Audience: ${input.targetAudience}`,
        ...(contextualNotes
            ? [
                "Additional topic context:",
                contextualNotes,
            ]
            : []),
        "",
        "Brief JSON:",
        JSON.stringify(brief, null, 2),
        "",
        "Return JSON shape:",
        JSON.stringify(
            {
                globalWarnings: [""],
                disclaimerSuggestions: [""],
                sectionFlags: [
                    {
                        sectionId: "section-1",
                        sectionTitle: "",
                        severity: "medium",
                        concerns: ["medical_advice_risk"],
                        detail: "",
                        citationNeededClaims: [""],
                        disclaimerSuggestion: "",
                    },
                ],
            },
            null,
            2
        ),
    ].join("\n");
}

function normalizeSafety(parsed: any, brief: GeneratedBriefPayload): SafetyPayload {
    const knownSectionIds = new Set(brief.outline.map((x) => x.id));
    const knownSectionTitles = new Map(brief.outline.map((x) => [x.h2.toLowerCase(), x.id]));

    const globalWarnings = normalizeStringArray(parsed?.globalWarnings, 0, 12);
    const disclaimerSuggestions = normalizeStringArray(parsed?.disclaimerSuggestions, 0, 8);

    const sectionFlagsRaw = Array.isArray(parsed?.sectionFlags) ? parsed.sectionFlags : [];
    const sectionFlags: SafetyFlag[] = [];

    for (const item of sectionFlagsRaw) {
        if (!item || typeof item !== "object") continue;
        const obj = item as Record<string, unknown>;

        const title = compactWhitespace(String(obj.sectionTitle || ""));
        const providedSectionId = compactWhitespace(String(obj.sectionId || ""));

        let sectionId = providedSectionId;
        if (!sectionId && title) {
            sectionId = knownSectionTitles.get(title.toLowerCase()) || "";
        }
        if (sectionId && !knownSectionIds.has(sectionId)) {
            sectionId = "";
        }

        const severityRaw = compactWhitespace(String(obj.severity || "")).toLowerCase();
        const severity: "low" | "medium" | "high" =
            severityRaw === "high" ? "high" : severityRaw === "low" ? "low" : "medium";

        const concerns = normalizeStringArray(obj.concerns, 0, 8);
        const detail = compactWhitespace(String(obj.detail || ""));
        const citationNeededClaims = normalizeStringArray(obj.citationNeededClaims, 0, 8);
        const disclaimerSuggestion = compactWhitespace(String(obj.disclaimerSuggestion || ""));

        if (!sectionId && !title) continue;

        sectionFlags.push({
            sectionId: sectionId || undefined,
            sectionTitle: title || sectionId,
            severity,
            concerns,
            detail: detail || undefined,
            citationNeededClaims: citationNeededClaims.length ? citationNeededClaims : undefined,
            disclaimerSuggestion: disclaimerSuggestion || undefined,
        });

        if (sectionFlags.length >= 24) break;
    }

    return { globalWarnings, disclaimerSuggestions, sectionFlags };
}

function choosePrimarySchemaType(schemaRecommendation: string[]) {
    if (schemaRecommendation.includes("HowTo")) return "HowTo";
    if (schemaRecommendation.includes("Article")) return "Article";
    if (schemaRecommendation.includes("FAQPage")) return "FAQPage";
    return "Article";
}

function buildDraftMarkdownFromBrief(brief: {
    targetKeyword: string;
    targetAudience: string;
    differentiationAngle: string;
    outline: any;
    faqSuggestions: any;
    semanticKeywords: any;
    longTailQuestions: any;
    disclaimerSuggestions: any;
}) {
    const outline = normalizeOutline(brief.outline, []);
    const faqSuggestions = normalizeStringArray(brief.faqSuggestions, 0, 8);
    const semanticKeywords = normalizeStringArray(brief.semanticKeywords, 0, 24);
    const longTailQuestions = normalizeStringArray(brief.longTailQuestions, 0, 10);
    const disclaimerSuggestions = normalizeStringArray(brief.disclaimerSuggestions, 0, 8);

    const lines: string[] = [
        `# Draft: ${brief.targetKeyword}`,
        "",
        "## Positioning",
        brief.differentiationAngle,
        "",
        "## Audience context",
        `Primary audience: ${brief.targetAudience}`,
        "",
    ];

    for (const section of outline) {
        lines.push(`## ${section.h2}`);
        lines.push("");

        if (section.keyPoints.length) {
            lines.push("Key points to cover:");
            for (const point of section.keyPoints) lines.push(`- ${point}`);
            lines.push("");
        }

        if (Array.isArray(section.internalLinkOpportunities) && section.internalLinkOpportunities.length) {
            lines.push("Internal link opportunities:");
            for (const link of section.internalLinkOpportunities) {
                const reason = link.reason ? ` - ${link.reason}` : "";
                lines.push(`- [${link.label}](${link.url})${reason}`);
            }
            lines.push("");
        }

        for (const sub of section.h3s || []) {
            lines.push(`### ${sub.title}`);
            lines.push("");

            if (sub.keyPoints.length) {
                for (const point of sub.keyPoints) lines.push(`- ${point}`);
                lines.push("");
            }

            if (Array.isArray(sub.internalLinkOpportunities) && sub.internalLinkOpportunities.length) {
                for (const link of sub.internalLinkOpportunities) {
                    const reason = link.reason ? ` - ${link.reason}` : "";
                    lines.push(`- [${link.label}](${link.url})${reason}`);
                }
                lines.push("");
            }
        }
    }

    if (faqSuggestions.length) {
        lines.push("## Frequently asked questions");
        lines.push("");
        for (const question of faqSuggestions) {
            lines.push(`### ${question}`);
            lines.push("Draft answer goes here.");
            lines.push("");
        }
    }

    if (semanticKeywords.length) {
        lines.push("## SEO coverage checklist");
        lines.push("");
        lines.push(`- Semantic keywords: ${semanticKeywords.join(", ")}`);
        lines.push("");
    }

    if (longTailQuestions.length) {
        lines.push("- Long-tail questions to answer:");
        for (const question of longTailQuestions) lines.push(`  - ${question}`);
        lines.push("");
    }

    if (disclaimerSuggestions.length) {
        lines.push("## Safety and disclaimer notes");
        lines.push("");
        for (const note of disclaimerSuggestions) lines.push(`- ${note}`);
        lines.push("");
    }

    return lines.join("\n").trim();
}

async function ensureUniqueArticleSlug(baseSlug: string) {
    const base = slugify(baseSlug) || `brief-${Date.now().toString(36)}`;
    let attempt = base;

    for (let i = 0; i < 40; i += 1) {
        const existing = await prisma.article.findFirst({ where: { slug: attempt }, select: { id: true } });
        if (!existing) return attempt;
        attempt = `${base}-${i + 2}`;
    }

    return `${base}-${Date.now().toString(36).slice(-6)}`;
}

export async function listContentBriefs(options: {
    query?: string;
    status?: ContentBriefStatus | null;
    limit?: number;
}) {
    const query = compactWhitespace(String(options.query || ""));
    const limit = Math.min(Math.max(options.limit || 100, 1), 300);

    const where: any = {};
    if (options.status) where.status = options.status;
    if (query) {
        where.OR = [
            { targetKeyword: { contains: query, mode: "insensitive" } },
            { targetAudience: { contains: query, mode: "insensitive" } },
            { differentiationAngle: { contains: query, mode: "insensitive" } },
            { notes: { contains: query, mode: "insensitive" } },
        ];
    }

    return prisma.contentBrief.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        take: limit,
    });
}

export async function generateAndCreateContentBrief(input: BriefGenerationInput) {
    const targetKeyword = compactWhitespace(input.targetKeyword);
    const targetAudience = compactWhitespace(input.targetAudience);
    const notes = typeof input.notes === "string" ? input.notes.trim() : "";

    if (!targetKeyword) throw new Error("Target keyword is required");
    if (!targetAudience) throw new Error("Target audience is required");

    const candidates = await resolveLinkCandidates({
        targetKeyword,
        targetAudience,
        searchIntent: input.searchIntent,
    });

    const generationPrompt = buildGenerationPrompt(
        {
            targetKeyword,
            targetAudience,
            searchIntent: input.searchIntent,
            notes,
        },
        candidates
    );

    const generation = await generateLlmJson(generationPrompt);
    if (!generation) {
        throw new Error("LLM generation failed. Ensure Anthropic or OpenAI API keys are configured.");
    }

    const normalizedBrief = normalizeGeneratedBrief(generation.parsed, input, candidates);

    const safetyPrompt = buildSafetyPrompt(input, normalizedBrief);
    const safety = await generateLlmJson(safetyPrompt);
    const normalizedSafety = normalizeSafety(safety?.parsed || {}, normalizedBrief);

    const brief = await prisma.contentBrief.create({
        data: {
            targetKeyword,
            targetAudience,
            searchIntent: input.searchIntent,
            status: ContentBriefStatus.DRAFT,
            h1Options: normalizedBrief.h1Options,
            metaTitleOptions: normalizedBrief.metaTitleOptions,
            metaDescriptionOptions: normalizedBrief.metaDescriptionOptions,
            urlSlugSuggestion: normalizedBrief.urlSlugSuggestion,
            outline: normalizedBrief.outline,
            semanticKeywords: normalizedBrief.semanticKeywords,
            longTailQuestions: normalizedBrief.longTailQuestions,
            faqSuggestions: normalizedBrief.faqSuggestions,
            differentiationAngle: normalizedBrief.differentiationAngle,
            recommendedWordCount: normalizedBrief.recommendedWordCount,
            schemaRecommendation: normalizedBrief.schemaRecommendation,
            safetyFlags: normalizedSafety.sectionFlags,
            safetyGlobalWarnings: normalizedSafety.globalWarnings,
            disclaimerSuggestions: normalizedSafety.disclaimerSuggestions,
            selectedH1: normalizedBrief.h1Options[0] || null,
            selectedMetaTitle: normalizedBrief.metaTitleOptions[0] || null,
            selectedMetaDescription: normalizedBrief.metaDescriptionOptions[0] || null,
            internalLinkCatalog: candidates,
            generationPrompt,
            generationResponse: generation.responseText,
            safetyPrompt,
            safetyResponse: safety?.responseText || "",
            notes: notes || null,
        },
    });

    return brief;
}

function parsePatchJson(value: unknown) {
    if (value === undefined) return undefined;
    if (typeof value === "string") {
        const parsed = parseJsonObject(value);
        if (parsed && typeof parsed === "object") return parsed;
        if (value.trim().startsWith("[")) {
            try {
                return JSON.parse(value);
            } catch {
                throw new Error("Invalid JSON payload");
            }
        }
        return value;
    }
    return value;
}

export async function updateContentBrief(id: string, payload: Record<string, unknown>) {
    const data: any = {};

    if (payload.targetKeyword !== undefined) {
        const value = compactWhitespace(String(payload.targetKeyword || ""));
        if (!value) throw new Error("targetKeyword cannot be empty");
        data.targetKeyword = value;
    }

    if (payload.targetAudience !== undefined) {
        const value = compactWhitespace(String(payload.targetAudience || ""));
        if (!value) throw new Error("targetAudience cannot be empty");
        data.targetAudience = value;
    }

    if (payload.searchIntent !== undefined) {
        const intent = parseContentBriefIntent(String(payload.searchIntent || ""));
        if (!intent) throw new Error("Invalid searchIntent");
        data.searchIntent = intent;
    }

    if (payload.status !== undefined) {
        const status = parseContentBriefStatus(String(payload.status || ""));
        if (!status) throw new Error("Invalid status");
        data.status = status;
    }

    if (payload.h1Options !== undefined) {
        data.h1Options = normalizeStringArray(parsePatchJson(payload.h1Options), 0, 8);
    }
    if (payload.metaTitleOptions !== undefined) {
        data.metaTitleOptions = normalizeStringArray(parsePatchJson(payload.metaTitleOptions), 0, 8).map(
            normalizeMetaTitle
        );
    }
    if (payload.metaDescriptionOptions !== undefined) {
        data.metaDescriptionOptions = normalizeStringArray(
            parsePatchJson(payload.metaDescriptionOptions),
            0,
            8
        ).map(normalizeMetaDescription);
    }
    if (payload.urlSlugSuggestion !== undefined) {
        data.urlSlugSuggestion = slugify(String(payload.urlSlugSuggestion || "")) || "content-brief";
    }
    if (payload.outline !== undefined) {
        data.outline = normalizeOutline(parsePatchJson(payload.outline), []);
    }
    if (payload.semanticKeywords !== undefined) {
        data.semanticKeywords = normalizeStringArray(parsePatchJson(payload.semanticKeywords), 0, 30);
    }
    if (payload.longTailQuestions !== undefined) {
        data.longTailQuestions = normalizeStringArray(parsePatchJson(payload.longTailQuestions), 0, 20);
    }
    if (payload.faqSuggestions !== undefined) {
        data.faqSuggestions = normalizeStringArray(parsePatchJson(payload.faqSuggestions), 0, 20);
    }
    if (payload.differentiationAngle !== undefined) {
        data.differentiationAngle = compactWhitespace(String(payload.differentiationAngle || ""));
    }
    if (payload.recommendedWordCount !== undefined) {
        const raw = Number.parseInt(String(payload.recommendedWordCount), 10);
        if (!Number.isFinite(raw)) throw new Error("recommendedWordCount must be a number");
        data.recommendedWordCount = Math.min(5000, Math.max(300, raw));
    }
    if (payload.schemaRecommendation !== undefined) {
        data.schemaRecommendation = normalizeSchemaRecommendation(parsePatchJson(payload.schemaRecommendation));
    }
    if (payload.safetyFlags !== undefined) {
        data.safetyFlags = Array.isArray(payload.safetyFlags) ? payload.safetyFlags : [];
    }
    if (payload.safetyGlobalWarnings !== undefined) {
        data.safetyGlobalWarnings = normalizeStringArray(parsePatchJson(payload.safetyGlobalWarnings), 0, 20);
    }
    if (payload.disclaimerSuggestions !== undefined) {
        data.disclaimerSuggestions = normalizeStringArray(parsePatchJson(payload.disclaimerSuggestions), 0, 20);
    }

    if (payload.selectedH1 !== undefined) data.selectedH1 = compactWhitespace(String(payload.selectedH1 || "")) || null;
    if (payload.selectedMetaTitle !== undefined) {
        const value = compactWhitespace(String(payload.selectedMetaTitle || ""));
        data.selectedMetaTitle = value ? normalizeMetaTitle(value) : null;
    }
    if (payload.selectedMetaDescription !== undefined) {
        const value = compactWhitespace(String(payload.selectedMetaDescription || ""));
        data.selectedMetaDescription = value ? normalizeMetaDescription(value) : null;
    }
    if (payload.notes !== undefined) data.notes = compactWhitespace(String(payload.notes || "")) || null;

    return prisma.contentBrief.update({ where: { id }, data });
}

export async function convertContentBriefToDraft(id: string) {
    const brief = await prisma.contentBrief.findUnique({ where: { id } });
    if (!brief) throw new Error("Brief not found");

    if (brief.convertedArticleId) {
        const existing = await prisma.article.findUnique({ where: { id: brief.convertedArticleId } });
        if (existing) {
            return { article: existing, briefAlreadyConverted: true };
        }
    }

    const h1Options = normalizeStringArray(brief.h1Options, 0, 8);
    const metaTitles = normalizeStringArray(brief.metaTitleOptions, 0, 8).map(normalizeMetaTitle);
    const metaDescriptions = normalizeStringArray(brief.metaDescriptionOptions, 0, 8).map(normalizeMetaDescription);
    const faqSuggestions = normalizeStringArray(brief.faqSuggestions, 0, 12);
    const schemaRecommendation = normalizeSchemaRecommendation(brief.schemaRecommendation);

    const title = compactWhitespace(brief.selectedH1 || h1Options[0] || brief.targetKeyword || "Untitled brief draft");
    const slugBase = slugify(brief.urlSlugSuggestion || title || brief.targetKeyword || "brief-draft");
    const slug = await ensureUniqueArticleSlug(slugBase);

    const excerpt =
        compactWhitespace(brief.selectedMetaDescription || metaDescriptions[0] || brief.differentiationAngle || "") ||
        `Draft article for ${brief.targetKeyword}.`;

    const content = buildDraftMarkdownFromBrief({
        targetKeyword: brief.targetKeyword,
        targetAudience: brief.targetAudience,
        differentiationAngle: brief.differentiationAngle,
        outline: brief.outline,
        faqSuggestions,
        semanticKeywords: brief.semanticKeywords,
        longTailQuestions: brief.longTailQuestions,
        disclaimerSuggestions: brief.disclaimerSuggestions,
    });

    const article = await prisma.article.create({
        data: {
            title,
            slug,
            content,
            excerpt,
            metaTitle: normalizeMetaTitle(brief.selectedMetaTitle || metaTitles[0] || title),
            metaDescription: normalizeMetaDescription(brief.selectedMetaDescription || metaDescriptions[0] || excerpt),
            schemaType: choosePrimarySchemaType(schemaRecommendation),
            status: "DRAFT",
            faqs: faqSuggestions.map((question) => ({ question, answer: "Draft answer pending editorial review." })),
            briefJson: {
                source: "content_brief_generator",
                contentBriefId: brief.id,
                targetKeyword: brief.targetKeyword,
                searchIntent: brief.searchIntent,
                targetAudience: brief.targetAudience,
                recommendedWordCount: brief.recommendedWordCount,
                schemaRecommendation,
                safetyFlags: brief.safetyFlags || [],
                safetyGlobalWarnings: brief.safetyGlobalWarnings || [],
                disclaimerSuggestions: brief.disclaimerSuggestions || [],
            } as any,
        },
    });

    await prisma.contentBrief.update({
        where: { id: brief.id },
        data: {
            convertedArticleId: article.id,
            status: ContentBriefStatus.APPROVED,
        },
    });

    return { article, briefAlreadyConverted: false };
}

import crypto from "crypto";

import OpenAI from "openai";

import { markdownToPlainText } from "@/lib/markdown-plain";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/site-url";

export type RepurposeFormat = "ALL" | "LINKEDIN" | "X" | "VIDEO" | "NEWSLETTER";

type RepurposeLeafFormat = Exclude<RepurposeFormat, "ALL">;

type ArticleRepurposeInput = {
    id: string;
    title: string;
    slug: string | null;
    content: string;
};

type GenerationResult = {
    provider: "claude" | "openai" | "fallback";
    model: string;
    responseText: string;
    parsed: any;
};

type NormalizedRepurposeFields = {
    linkedinPost?: string;
    xThread?: string;
    shortVideoScript?: string;
    newsletterSubjectOptions?: string[];
    newsletterSnippet?: string;
};

type GenerateRepurposeOptions = {
    articleId: string;
    mode?: RepurposeFormat;
    trigger: "AUTO_PUBLISH" | "MANUAL_GENERATE" | "MANUAL_REGENERATE";
    actorUserId?: string | null;
    force?: boolean;
};

type UpdateRepurposeOptions = {
    articleId: string;
    actorUserId?: string | null;
    data: {
        linkedinPost?: string | null;
        xThread?: string | null;
        shortVideoScript?: string | null;
        newsletterSnippet?: string | null;
        newsletterSubjectOptions?: string[] | null;
        linkedinPublished?: boolean;
        xPublished?: boolean;
        videoPublished?: boolean;
        newsletterPublished?: boolean;
    };
};

export type RepurposeCompleteness = {
    linkedin: boolean;
    x: boolean;
    video: boolean;
    newsletter: boolean;
};

const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

function compactWhitespace(value: string) {
    return value.trim().replace(/\s+/g, " ");
}

function clip(value: string, max: number) {
    const text = String(value || "");
    if (text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}...`;
}

function parseJsonObject(text: string): any | null {
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

function wordCount(text: string) {
    return String(text || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
}

function hashRepurposeSource(article: Pick<ArticleRepurposeInput, "title" | "slug" | "content">) {
    return crypto
        .createHash("sha256")
        .update(`${article.title}\n${article.slug || ""}\n${article.content || ""}`)
        .digest("hex");
}

function extractSentences(text: string, maxCount: number) {
    const parts = String(text || "")
        .split(/(?<=[.!?])\s+/)
        .map((x) => compactWhitespace(x))
        .filter(Boolean);
    return parts.slice(0, Math.max(1, maxCount));
}

function parseStringList(value: unknown) {
    if (Array.isArray(value)) {
        return value
            .map((x) => compactWhitespace(String(x || "")))
            .filter(Boolean);
    }

    const text = String(value || "").trim();
    if (!text) return [];

    const split = text
        .split(/\n{2,}|\n|\|/g)
        .map((x) => compactWhitespace(x.replace(/^[\s\-*\d.)]+/, "")))
        .filter(Boolean);

    return split;
}

function normalizeNewsletterSubjectOptions(value: unknown, fallbackTitle: string) {
    const normalized = parseStringList(value)
        .map((line) => clip(compactWhitespace(line), 110))
        .filter(Boolean);

    const unique: string[] = [];
    for (const item of normalized) {
        if (!unique.includes(item)) unique.push(item);
        if (unique.length >= 3) break;
    }

    if (unique.length >= 3) return unique;

    const title = compactWhitespace(fallbackTitle || "Present Health");
    const defaults = [
        `${title}: What to know before you choose primary care`,
        `A clearer way to think about telehealth primary care`,
        `New guide: practical primary care without insurance confusion`,
    ];

    for (const candidate of defaults) {
        if (!unique.includes(candidate)) unique.push(candidate);
        if (unique.length >= 3) break;
    }

    return unique.slice(0, 3);
}

function normalizeLinkedinPost(value: unknown, article: ArticleRepurposeInput, articleUrl: string, plainText: string) {
    let text = String(value || "").trim();

    if (!text) {
        const summary = extractSentences(plainText, 4).join(" ");
        text = [
            "Most people do not need more healthcare noise. They need clear, ongoing primary care from the same physician.",
            "",
            `In this guide, we break down ${article.title.toLowerCase()} in plain language so patients and families can make better decisions without guessing. ${summary}`,
            "",
            "At Present Health, we focus on relationship-based, telehealth-first Direct Primary Care: continuity, transparent pricing, and practical next steps.",
            "",
            "Learn more: " + articleUrl,
            "What questions are you hearing most from patients or teams right now?",
        ].join("\n");
    }

    const lines = text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length === 1) {
        lines.unshift(`A better primary care conversation starts with clarity.`);
    }

    if (!lines.some((line) => line.toLowerCase().includes("learn more:"))) {
        lines.push(`Learn more: ${articleUrl}`);
    }

    const lastLine = lines[lines.length - 1] || "";
    if (!/[?]$/.test(lastLine) && !/discussion|thoughts|question/i.test(lastLine)) {
        lines.push("What part of this decision feels hardest for most people in your community?");
    }

    text = lines.join("\n\n");

    const wc = wordCount(text);
    if (wc < 150) {
        const padding = [
            "Too often, patients are stuck between high premiums, rushed visits, and fragmented follow-up.",
            "This is educational content only, not medical advice, and it is designed to help people ask better questions before they choose care.",
        ];

        const learnMoreIndex = lines.findIndex((line) => line.toLowerCase().startsWith("learn more:"));
        const base = [...lines];
        if (learnMoreIndex >= 0) {
            base.splice(learnMoreIndex, 0, ...padding);
        } else {
            base.push(...padding);
        }
        text = base.join("\n\n");
    }

    if (wordCount(text) > 300) {
        const paragraphs = text.split(/\n\n+/);
        const kept: string[] = [];
        let running = 0;
        for (const paragraph of paragraphs) {
            const count = wordCount(paragraph);
            if (running + count > 295) break;
            kept.push(paragraph);
            running += count;
        }
        text = kept.join("\n\n").trim();
        if (!/learn more:/i.test(text)) {
            text = `${text}\n\nLearn more: ${articleUrl}`.trim();
        }
        if (!/[?]$/.test(text)) {
            text = `${text}\n\nWhat questions should we answer next?`;
        }
    }

    return text.trim();
}

function normalizeXThread(value: unknown, article: ArticleRepurposeInput, articleUrl: string, plainText: string) {
    let tweets = parseStringList(value)
        .map((line) => line.replace(/^\d+\s*\/\s*\d+\s*/, "").trim())
        .filter(Boolean);

    if (!tweets.length) {
        const summary = extractSentences(plainText, 4);
        tweets = [
            `Primary care should be simpler than it is. ${article.title} is about making the decision process clearer.`,
            summary[0] || "People deserve transparent pricing and continuity with the same physician.",
            summary[1] || "Telehealth-first DPC can make routine care faster and less fragmented.",
            `Want the full breakdown? Learn more: ${articleUrl}`,
        ];
    }

    if (tweets.length < 3) {
        const backup = [
            "Continuity matters: seeing the same physician changes follow-through.",
            "Educational note: this is general information, not medical advice.",
            `Read more: ${articleUrl}`,
        ];
        while (tweets.length < 3) {
            tweets.push(backup[tweets.length - 1] || backup[backup.length - 1]);
        }
    }

    if (tweets.length > 5) {
        tweets = tweets.slice(0, 5);
    }

    const total = tweets.length;
    const numbered = tweets.map((tweet, index) => {
        let body = compactWhitespace(tweet);

        if (index === total - 1) {
            if (!body.includes(articleUrl)) {
                body = `${body} Learn more: ${articleUrl}`.trim();
            }
            if (!/\b(read|learn|explore|see)\b/i.test(body)) {
                body = `Want the full guide? ${body}`;
            }
        }

        const prefix = `${index + 1}/${total} `;
        const maxBodyLength = 279 - prefix.length;
        body = clip(body, Math.max(80, maxBodyLength));

        return `${prefix}${body}`;
    });

    return numbered.join("\n\n");
}

function normalizeVideoScript(value: unknown, articleUrl: string, plainText: string) {
    let lines: string[] = [];

    if (Array.isArray(value)) {
        lines = value
            .map((item) => {
                if (typeof item === "string") return compactWhitespace(item);
                if (item && typeof item === "object") {
                    const obj = item as Record<string, unknown>;
                    const timestamp = compactWhitespace(String(obj.timestamp || "")) || "00:00";
                    const text = compactWhitespace(String(obj.text || obj.line || ""));
                    if (!text) return "";
                    return `${timestamp} - ${text}`;
                }
                return "";
            })
            .filter(Boolean);
    } else {
        lines = parseStringList(value);
    }

    if (!lines.length) {
        const summary = extractSentences(plainText, 4);
        lines = [
            "00:00 - Hook: Primary care should feel personal and clear, not rushed and confusing.",
            `00:12 - Point 1: ${summary[0] || "Direct Primary Care gives patients continuity with the same physician."}`,
            `00:28 - Point 2: ${summary[1] || "Telehealth-first visits make follow-up and routine care easier to access."}`,
            `00:44 - Point 3: ${summary[2] || "Transparent membership pricing helps people budget care with fewer surprises."}`,
            "01:00 - CTA: If you want the full walkthrough, read the full guide at Present Health.",
        ];
    }

    const normalized: string[] = [];
    const defaultTimestamps = ["00:00", "00:12", "00:28", "00:44", "01:00"];

    for (let i = 0; i < Math.min(lines.length, 6); i += 1) {
        const raw = compactWhitespace(lines[i] || "");
        if (!raw) continue;

        const parts = raw.split(/\s+-\s+/, 2);
        if (/^\d{2}:\d{2}$/.test(parts[0] || "")) {
            normalized.push(`${parts[0]} - ${compactWhitespace(parts[1] || "") || compactWhitespace(raw.replace(parts[0], ""))}`);
            continue;
        }

        normalized.push(`${defaultTimestamps[Math.min(i, defaultTimestamps.length - 1)]} - ${raw}`);
    }

    if (!normalized.length) {
        normalized.push("00:00 - Hook: Here is a simple way to think about primary care access and cost.");
    }

    const ctaIndex = normalized.length - 1;
    const ctaLine = normalized[ctaIndex] || "";
    if (!/cta|learn more|read the full guide|join/i.test(ctaLine)) {
        normalized.push(`01:10 - CTA: Learn more: ${articleUrl}`);
    } else if (!ctaLine.includes(articleUrl)) {
        normalized[ctaIndex] = `${ctaLine} Learn more: ${articleUrl}`.trim();
    }

    return normalized.join("\n");
}

function normalizeNewsletterSnippet(value: unknown, articleUrl: string, plainText: string) {
    let text = compactWhitespace(String(value || ""));

    if (!text) {
        const summary = extractSentences(plainText, 4).join(" ");
        text = `${summary} This overview explains how telehealth-first Direct Primary Care can simplify access, continuity, and monthly cost expectations. Read the full guide to see examples, common FAQs, and how to get started with Present Health.`;
    }

    if (!/read the full guide|learn more/i.test(text)) {
        text = `${text} Read the full guide -> ${articleUrl}`.trim();
    } else if (!text.includes(articleUrl)) {
        text = `${text} ${articleUrl}`.trim();
    }

    let words = wordCount(text);
    if (words < 100) {
        text = `${text} This content is educational and designed to help people ask better questions about primary care options, pricing, and continuity before choosing a plan.`;
        words = wordCount(text);
    }

    if (words > 150) {
        const tokens = text.split(/\s+/).filter(Boolean);
        text = `${tokens.slice(0, 148).join(" ")}...`;
        if (!text.includes(articleUrl)) {
            text = `${text} Read the full guide -> ${articleUrl}`;
        }
    }

    return text.trim();
}

function normalizeByMode(input: {
    requested: RepurposeLeafFormat[];
    article: ArticleRepurposeInput;
    articleUrl: string;
    plainText: string;
    parsed: any;
}): NormalizedRepurposeFields {
    const out: NormalizedRepurposeFields = {};
    const { requested, article, articleUrl, plainText, parsed } = input;

    if (requested.includes("LINKEDIN")) {
        out.linkedinPost = normalizeLinkedinPost(parsed?.linkedinPost, article, articleUrl, plainText);
    }

    if (requested.includes("X")) {
        out.xThread = normalizeXThread(parsed?.xThread ?? parsed?.twitterThread, article, articleUrl, plainText);
    }

    if (requested.includes("VIDEO")) {
        out.shortVideoScript = normalizeVideoScript(parsed?.shortVideoScript ?? parsed?.videoScript, articleUrl, plainText);
    }

    if (requested.includes("NEWSLETTER")) {
        out.newsletterSubjectOptions = normalizeNewsletterSubjectOptions(
            parsed?.newsletter?.subjectOptions ?? parsed?.newsletterSubjectOptions,
            article.title
        );
        out.newsletterSnippet = normalizeNewsletterSnippet(
            parsed?.newsletter?.snippet ?? parsed?.newsletterSnippet,
            articleUrl,
            plainText
        );
    }

    return out;
}

function requestedFormats(mode: RepurposeFormat): RepurposeLeafFormat[] {
    if (mode === "ALL") return ["LINKEDIN", "X", "VIDEO", "NEWSLETTER"];
    return [mode];
}

function hasAllFieldsForMode(asset: {
    linkedinPost: string | null;
    xThread: string | null;
    shortVideoScript: string | null;
    newsletterSnippet: string | null;
    newsletterSubjectOptions: unknown;
},
mode: RepurposeFormat) {
    const requested = requestedFormats(mode);

    const hasNewsletterSubjects = Array.isArray(asset.newsletterSubjectOptions)
        ? asset.newsletterSubjectOptions.length >= 3
        : false;

    const byFormat: Record<RepurposeLeafFormat, boolean> = {
        LINKEDIN: Boolean(asset.linkedinPost?.trim()),
        X: Boolean(asset.xThread?.trim()),
        VIDEO: Boolean(asset.shortVideoScript?.trim()),
        NEWSLETTER: Boolean(asset.newsletterSnippet?.trim()) && hasNewsletterSubjects,
    };

    return requested.every((format) => byFormat[format]);
}

async function callClaude(prompt: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!apiKey) return null;

    const model = process.env.CONTENT_REPURPOSE_ANTHROPIC_MODEL || DEFAULT_CLAUDE_MODEL;
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
            temperature: 0.3,
            messages: [{ role: "user", content: prompt }],
        }),
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Claude repurpose request failed (${res.status}): ${detail || "unknown error"}`);
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

    const model = process.env.CONTENT_REPURPOSE_OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
        model,
        temperature: 0.3,
        max_tokens: 2600,
        messages: [
            {
                role: "system",
                content:
                    "You generate marketing repurposing assets for healthcare educational content. Return strict JSON only and never provide medical advice.",
            },
            { role: "user", content: prompt },
        ],
    });

    const text = response.choices[0]?.message?.content?.trim() || "";
    return { model, text };
}

function buildGenerationPrompt(options: {
    article: ArticleRepurposeInput;
    articleUrl: string;
    mode: RepurposeFormat;
}) {
    const { article, articleUrl, mode } = options;
    const requested = requestedFormats(mode);

    const outputShape = {
        linkedinPost: "string (150-300 words)",
        xThread: ["string", "string", "string"],
        shortVideoScript: [
            { timestamp: "00:00", text: "hook" },
            { timestamp: "00:15", text: "key point" },
            { timestamp: "01:00", text: "cta" },
        ],
        newsletter: {
            subjectOptions: ["string", "string", "string"],
            snippet: "string (100-150 words)",
        },
    };

    const modeLine =
        mode === "ALL"
            ? "Generate all formats."
            : `Generate only this format: ${mode}. Return JSON with only the requested key(s).`;

    const contentForPrompt = clip(article.content || "", 18000);

    return [
        "You are creating content repurposing assets for Present Health.",
        "Brand voice: Warm, knowledgeable, physician-led. Not corporate healthcare speak. A real doctor who chose to do things differently.",
        "This is educational marketing content only.",
        "Never include medical advice, diagnosis, treatment instructions, or individualized clinical recommendations.",
        "If a line risks sounding like advice, keep it general and route people to the full article.",
        "",
        "Platform requirements:",
        "- LinkedIn post: 150-300 words, first line is a hook, professional but warm, ends with a discussion question or call to discussion, includes Learn more link.",
        "- X thread: 3-5 tweets, each under 280 chars, first tweet is hook, last tweet includes CTA + link.",
        "- Short video script: 60-90 seconds, hook in first line, 3-4 key points, CTA at end, timestamped lines.",
        "- Newsletter: 3 subject line options + 100-150 word summary + Read the full guide link.",
        "",
        `Article title: ${article.title}`,
        `Article URL: ${articleUrl}`,
        "",
        modeLine,
        `Requested format keys: ${requested.join(", ")}`,
        "",
        "Return STRICT JSON only.",
        "Expected full output shape:",
        JSON.stringify(outputShape, null, 2),
        "",
        "Article content (markdown):",
        contentForPrompt,
    ].join("\n");
}

function buildFallbackParsed(article: ArticleRepurposeInput, articleUrl: string) {
    const plainText = markdownToPlainText(article.content || "");
    return {
        linkedinPost: normalizeLinkedinPost("", article, articleUrl, plainText),
        xThread: normalizeXThread("", article, articleUrl, plainText)
            .split(/\n\n+/)
            .map((x) => x.trim())
            .filter(Boolean),
        shortVideoScript: normalizeVideoScript("", articleUrl, plainText)
            .split(/\n+/)
            .map((line) => {
                const [timestamp, ...rest] = line.split(" - ");
                return { timestamp: timestamp || "00:00", text: rest.join(" - ") || line };
            }),
        newsletter: {
            subjectOptions: normalizeNewsletterSubjectOptions([], article.title),
            snippet: normalizeNewsletterSnippet("", articleUrl, plainText),
        },
    };
}

async function runLlmPrompt(prompt: string, fallback: any): Promise<GenerationResult> {
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
        console.error("[content-repurpose] Claude generation failed", error);
    }

    try {
        const openai = await callOpenAi(prompt);
        if (openai?.text) {
            const parsed = parseJsonObject(openai.text);
            if (parsed) {
                return {
                    provider: "openai",
                    model: openai.model,
                    responseText: openai.text,
                    parsed,
                };
            }
        }
    } catch (error) {
        console.error("[content-repurpose] OpenAI generation failed", error);
    }

    return {
        provider: "fallback",
        model: "fallback-v1",
        responseText: JSON.stringify(fallback, null, 2),
        parsed: fallback,
    };
}

function truncateForLog(value: string) {
    return clip(String(value || ""), 22000);
}

function normalizeGenerationLog(value: unknown) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
        const obj = value as Record<string, unknown>;
        if (Array.isArray(obj.entries)) return obj.entries;
    }
    return [] as any[];
}

function buildNextGenerationLog(
    existingLog: unknown,
    entry: Record<string, unknown>
) {
    const entries = normalizeGenerationLog(existingLog);
    const next = [...entries, entry];
    return next.slice(-30);
}

function parseRepurposeSubjectOptions(value: unknown) {
    if (!Array.isArray(value)) return [] as string[];
    return value
        .map((x) => compactWhitespace(String(x || "")))
        .filter(Boolean)
        .slice(0, 3);
}

function buildUpdateDataFromFields(fields: NormalizedRepurposeFields) {
    const data: Record<string, unknown> = {};

    if (fields.linkedinPost !== undefined) data.linkedinPost = fields.linkedinPost || null;
    if (fields.xThread !== undefined) data.xThread = fields.xThread || null;
    if (fields.shortVideoScript !== undefined) data.shortVideoScript = fields.shortVideoScript || null;
    if (fields.newsletterSnippet !== undefined) data.newsletterSnippet = fields.newsletterSnippet || null;
    if (fields.newsletterSubjectOptions !== undefined) {
        data.newsletterSubjectOptions = fields.newsletterSubjectOptions.length ? fields.newsletterSubjectOptions : [];
    }

    return data;
}

export function parseRepurposeFormat(value: unknown): RepurposeFormat {
    const raw = String(value || "").trim().toUpperCase();
    if (raw === "LINKEDIN") return "LINKEDIN";
    if (raw === "X") return "X";
    if (raw === "VIDEO") return "VIDEO";
    if (raw === "NEWSLETTER") return "NEWSLETTER";
    return "ALL";
}

export function computeRepurposeCompleteness(asset: {
    linkedinPost: string | null;
    xThread: string | null;
    shortVideoScript: string | null;
    newsletterSnippet: string | null;
    newsletterSubjectOptions: unknown;
} | null): RepurposeCompleteness {
    if (!asset) {
        return {
            linkedin: false,
            x: false,
            video: false,
            newsletter: false,
        };
    }

    const subjects = parseRepurposeSubjectOptions(asset.newsletterSubjectOptions);

    return {
        linkedin: Boolean(asset.linkedinPost?.trim()),
        x: Boolean(asset.xThread?.trim()),
        video: Boolean(asset.shortVideoScript?.trim()),
        newsletter: Boolean(asset.newsletterSnippet?.trim()) && subjects.length >= 3,
    };
}

async function loadArticleForRepurpose(articleId: string): Promise<ArticleRepurposeInput> {
    const article = await prisma.article.findUnique({
        where: { id: articleId },
        select: {
            id: true,
            title: true,
            slug: true,
            content: true,
        },
    });

    if (!article) {
        throw new Error("Article not found");
    }

    return {
        id: article.id,
        title: article.title,
        slug: article.slug,
        content: article.content || "",
    };
}

export async function getArticleRepurposeState(articleId: string) {
    const [article, asset] = await Promise.all([
        loadArticleForRepurpose(articleId),
        prisma.contentRepurposeAsset.findUnique({ where: { articleId } }),
    ]);

    const contentHash = hashRepurposeSource(article);
    const stale = Boolean(asset && asset.contentHash !== contentHash);
    const completeness = computeRepurposeCompleteness(asset);

    return {
        article,
        asset,
        stale,
        completeness,
        contentHash,
        articleUrl: absoluteUrl(`/learn/${article.slug || article.id}`),
    };
}

export async function generateArticleRepurpose(options: GenerateRepurposeOptions) {
    const mode = options.mode || "ALL";

    const [article, existing] = await Promise.all([
        loadArticleForRepurpose(options.articleId),
        prisma.contentRepurposeAsset.findUnique({ where: { articleId: options.articleId } }),
    ]);

    const articleUrl = absoluteUrl(`/learn/${article.slug || article.id}`);
    const contentHash = hashRepurposeSource(article);

    const effectiveMode: RepurposeFormat =
        mode !== "ALL" && existing && existing.contentHash !== contentHash ? "ALL" : mode;

    const upToDate =
        existing &&
        existing.contentHash === contentHash &&
        hasAllFieldsForMode(existing, effectiveMode);

    if (upToDate && !options.force) {
        return {
            asset: existing,
            skipped: true,
            mode: effectiveMode,
        } as const;
    }

    const prompt = buildGenerationPrompt({
        article,
        articleUrl,
        mode: effectiveMode,
    });

    const fallbackParsed = buildFallbackParsed(article, articleUrl);
    const generation = await runLlmPrompt(prompt, fallbackParsed);
    const plainText = markdownToPlainText(article.content || "");

    const normalizedFields = normalizeByMode({
        requested: requestedFormats(effectiveMode),
        article,
        articleUrl,
        plainText,
        parsed: generation.parsed,
    });

    const updateData = {
        ...buildUpdateDataFromFields(normalizedFields),
        contentHash,
        articleUrl,
        lastGeneratedAt: new Date(),
        generationLog: buildNextGenerationLog(existing?.generationLog, {
            createdAt: new Date().toISOString(),
            trigger: options.trigger,
            modeRequested: mode,
            modeExecuted: effectiveMode,
            force: Boolean(options.force),
            provider: generation.provider,
            model: generation.model,
            prompt: truncateForLog(prompt),
            response: truncateForLog(generation.responseText),
            updatedFields: Object.keys(buildUpdateDataFromFields(normalizedFields)),
        }),
    } as const;

    const asset = await prisma.contentRepurposeAsset.upsert({
        where: { articleId: options.articleId },
        create: {
            articleId: options.articleId,
            contentHash,
            articleUrl,
            lastGeneratedAt: new Date(),
            generationLog: updateData.generationLog,
            ...buildUpdateDataFromFields(normalizedFields),
        },
        update: updateData,
    });

    await prisma.auditLog.create({
        data: {
            actorUserId: options.actorUserId || null,
            action: "CONTENT_REPURPOSE_GENERATE",
            entityType: "Article",
            entityId: options.articleId,
            metadata: {
                articleId: options.articleId,
                modeRequested: mode,
                modeExecuted: effectiveMode,
                provider: generation.provider,
                model: generation.model,
                force: Boolean(options.force),
            },
        },
    });

    return {
        asset,
        skipped: false,
        mode: effectiveMode,
    } as const;
}

function normalizeEditableText(value: string | null | undefined) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = String(value).trim();
    return trimmed || null;
}

function nextPublishedAt(current: Date | null, desired: boolean | undefined) {
    if (desired === undefined) return current;
    if (!desired) return null;
    return current || new Date();
}

export async function updateArticleRepurposeAsset(options: UpdateRepurposeOptions) {
    const article = await loadArticleForRepurpose(options.articleId);
    const contentHash = hashRepurposeSource(article);
    const articleUrl = absoluteUrl(`/learn/${article.slug || article.id}`);

    const existing = await prisma.contentRepurposeAsset.findUnique({ where: { articleId: options.articleId } });

    const newsletterSubjectOptions =
        options.data.newsletterSubjectOptions === undefined
            ? undefined
            : options.data.newsletterSubjectOptions === null
                ? []
                : normalizeNewsletterSubjectOptions(options.data.newsletterSubjectOptions, article.title);

    const updateData: Record<string, unknown> = {
        contentHash,
        articleUrl,
    };

    const linkedinPost = normalizeEditableText(options.data.linkedinPost);
    if (linkedinPost !== undefined) updateData.linkedinPost = linkedinPost;

    const xThread = normalizeEditableText(options.data.xThread);
    if (xThread !== undefined) updateData.xThread = xThread;

    const shortVideoScript = normalizeEditableText(options.data.shortVideoScript);
    if (shortVideoScript !== undefined) updateData.shortVideoScript = shortVideoScript;

    const newsletterSnippet = normalizeEditableText(options.data.newsletterSnippet);
    if (newsletterSnippet !== undefined) updateData.newsletterSnippet = newsletterSnippet;

    if (newsletterSubjectOptions !== undefined) {
        updateData.newsletterSubjectOptions = newsletterSubjectOptions;
    }

    const currentLinkedin = existing?.linkedinPublishedAt || null;
    const currentX = existing?.xPublishedAt || null;
    const currentVideo = existing?.videoPublishedAt || null;
    const currentNewsletter = existing?.newsletterPublishedAt || null;

    if (options.data.linkedinPublished !== undefined) {
        updateData.linkedinPublishedAt = nextPublishedAt(currentLinkedin, options.data.linkedinPublished);
    }
    if (options.data.xPublished !== undefined) {
        updateData.xPublishedAt = nextPublishedAt(currentX, options.data.xPublished);
    }
    if (options.data.videoPublished !== undefined) {
        updateData.videoPublishedAt = nextPublishedAt(currentVideo, options.data.videoPublished);
    }
    if (options.data.newsletterPublished !== undefined) {
        updateData.newsletterPublishedAt = nextPublishedAt(currentNewsletter, options.data.newsletterPublished);
    }

    const asset = await prisma.contentRepurposeAsset.upsert({
        where: { articleId: options.articleId },
        create: {
            articleId: options.articleId,
            contentHash,
            articleUrl,
            generationLog: buildNextGenerationLog(null, {
                createdAt: new Date().toISOString(),
                trigger: "MANUAL_EDIT",
                actorUserId: options.actorUserId || null,
                updatedFields: Object.keys(updateData),
            }),
            ...(updateData as any),
        },
        update: {
            ...(updateData as any),
            generationLog: buildNextGenerationLog(existing?.generationLog, {
                createdAt: new Date().toISOString(),
                trigger: "MANUAL_EDIT",
                actorUserId: options.actorUserId || null,
                updatedFields: Object.keys(updateData),
            }),
        },
    });

    await prisma.auditLog.create({
        data: {
            actorUserId: options.actorUserId || null,
            action: "CONTENT_REPURPOSE_EDIT",
            entityType: "Article",
            entityId: options.articleId,
            metadata: {
                articleId: options.articleId,
                updatedFields: Object.keys(updateData),
            },
        },
    });

    return asset;
}

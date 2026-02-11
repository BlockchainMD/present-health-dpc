import OpenAI from "openai";
import {
    PressReleaseStatus,
    PrMentionType,
    PrOpportunityType,
    PrPitchStatus,
} from "@prisma/client";
import { google } from "googleapis";
import { subDays } from "date-fns";

import { prisma } from "@/lib/prisma";
import { DEFAULT_ENTITY_SPINE_TEXT, getCanonicalNapSettings } from "@/lib/citations";

const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_BOILERPLATE_KEY = "default";

export const PRESS_RELEASE_STATUS_LABELS: Record<PressReleaseStatus, string> = {
    DRAFT: "Draft",
    APPROVED: "Approved",
    SUBMITTED: "Submitted",
    PUBLISHED: "Published",
};

export const PR_OPPORTUNITY_TYPE_LABELS: Record<PrOpportunityType, string> = {
    PODCAST: "Podcast",
    INTERVIEW: "Interview",
    GUEST_POST: "Guest Post",
    MEDIA_MENTION: "Media Mention",
    AWARD: "Award",
};

export const PR_PITCH_STATUS_LABELS: Record<PrPitchStatus, string> = {
    IDENTIFIED: "Identified",
    PITCHED: "Pitched",
    ACCEPTED: "Accepted",
    COMPLETED: "Completed",
    DECLINED: "Declined",
};

export const PR_MENTION_TYPE_LABELS: Record<PrMentionType, string> = {
    MEDIA_MENTION: "Media Mention",
    BACKLINK: "Backlink",
    PODCAST_APPEARANCE: "Podcast Appearance",
    PRESS_RELEASE_PICKUP: "Press Release Pickup",
};

type GenerationResult = {
    provider: "claude" | "openai" | "fallback";
    model: string;
    responseText: string;
    parsed: any;
};

type BoilerplateSnippet = {
    id: string;
    name: string;
    snippet: string;
};

function compactWhitespace(value: unknown) {
    return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeText(value: unknown, max = 20000) {
    const text = String(value ?? "").trim();
    if (!text) return "";
    return text.slice(0, max);
}

function normalizeEmail(value: unknown) {
    return compactWhitespace(value).toLowerCase().slice(0, 254);
}

function normalizeOptionalString(value: unknown, max = 4000) {
    const text = normalizeText(value, max);
    return text || null;
}

function parseDate(value: unknown) {
    const raw = compactWhitespace(value);
    if (!raw) return null;
    const date = new Date(raw);
    if (!Number.isFinite(date.getTime())) return null;
    return date;
}

function normalizeStringArray(value: unknown, maxItems = 50, maxLen = 300) {
    const list = Array.isArray(value)
        ? value
        : typeof value === "string"
            ? value.split(/\n|,|;/g)
            : [];

    const out: string[] = [];
    for (const item of list) {
        const text = compactWhitespace(item).slice(0, maxLen);
        if (!text || out.includes(text)) continue;
        out.push(text);
        if (out.length >= maxItems) break;
    }
    return out;
}

function parseJsonObject(text: string): any | null {
    const raw = String(text || "").trim();
    if (!raw) return null;

    try {
        const direct = JSON.parse(raw);
        if (direct && typeof direct === "object") return direct;
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

function normalizeSnippets(value: unknown): BoilerplateSnippet[] {
    if (!Array.isArray(value)) return [];

    const snippets: BoilerplateSnippet[] = [];
    for (let i = 0; i < value.length; i += 1) {
        const item = value[i];
        if (!item || typeof item !== "object") continue;

        const obj = item as Record<string, unknown>;
        const id = compactWhitespace(obj.id || `snippet-${i + 1}`) || `snippet-${i + 1}`;
        const name = compactWhitespace(obj.name || "");
        const snippet = normalizeText(obj.snippet || "", 2000);
        if (!name || !snippet) continue;

        snippets.push({ id, name, snippet });
    }

    return snippets.slice(0, 20);
}

function parsePressReleaseStatus(value: unknown) {
    const raw = compactWhitespace(value).toUpperCase();
    if ((Object.values(PressReleaseStatus) as string[]).includes(raw)) {
        return raw as PressReleaseStatus;
    }
    return null;
}

function parseOpportunityType(value: unknown) {
    const raw = compactWhitespace(value).toUpperCase();
    if ((Object.values(PrOpportunityType) as string[]).includes(raw)) {
        return raw as PrOpportunityType;
    }
    return null;
}

function parsePitchStatus(value: unknown) {
    const raw = compactWhitespace(value).toUpperCase();
    if ((Object.values(PrPitchStatus) as string[]).includes(raw)) {
        return raw as PrPitchStatus;
    }
    return null;
}

function parseMentionType(value: unknown) {
    const raw = compactWhitespace(value).toUpperCase();
    if ((Object.values(PrMentionType) as string[]).includes(raw)) {
        return raw as PrMentionType;
    }
    return null;
}

async function callClaude(prompt: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!apiKey) return null;

    const model = process.env.PR_ANTHROPIC_MODEL || DEFAULT_CLAUDE_MODEL;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model,
            max_tokens: 2600,
            temperature: 0.2,
            messages: [{ role: "user", content: prompt }],
        }),
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Claude PR request failed (${res.status}): ${detail || "unknown error"}`);
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

    const model = process.env.PR_OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
        model,
        temperature: 0.2,
        max_tokens: 2200,
        messages: [
            {
                role: "system",
                content: "You are a healthcare PR strategist. Return strict JSON only.",
            },
            { role: "user", content: prompt },
        ],
    });

    const text = response.choices[0]?.message?.content?.trim() || "";
    return { model, text };
}

async function runLlmJson(prompt: string, fallbackParsed: any): Promise<GenerationResult> {
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
        console.error("[pr] Claude generation failed", error);
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
        console.error("[pr] OpenAI generation failed", error);
    }

    return {
        provider: "fallback",
        model: "fallback-v1",
        responseText: JSON.stringify(fallbackParsed, null, 2),
        parsed: fallbackParsed,
    };
}

function monthStart(date = new Date()) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function monthEnd(date = new Date()) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function normalizeUrl(value: unknown) {
    const raw = compactWhitespace(value);
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
}

export async function getPrBoilerplate() {
    const existing = await prisma.prBoilerplate.findUnique({
        where: { key: DEFAULT_BOILERPLATE_KEY },
    });

    if (existing) {
        return {
            ...existing,
            physicianBioSnippets: normalizeSnippets(existing.physicianBioSnippets),
        };
    }

    const [canonical, physicians] = await Promise.all([
        getCanonicalNapSettings(),
        prisma.physician.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
            take: 8,
            select: {
                id: true,
                name: true,
                credentials: true,
                bio: true,
            },
        }),
    ]);

    const snippets: BoilerplateSnippet[] = physicians.map((physician) => ({
        id: physician.id,
        name: physician.name,
        snippet: normalizeText(
            physician.bio || `${physician.name}${physician.credentials ? `, ${physician.credentials}` : ""}, is a family physician at Present Health.`,
            700
        ),
    }));

    const created = await prisma.prBoilerplate.create({
        data: {
            key: DEFAULT_BOILERPLATE_KEY,
            aboutBoilerplate: canonical.entityDescription || DEFAULT_ENTITY_SPINE_TEXT,
            physicianBioSnippets: snippets as any,
            mediaContactName: "Present Health Media Team",
            mediaContactEmail: process.env.MEDIA_CONTACT_EMAIL || process.env.ADMIN_NOTIFY_EMAIL || "",
            mediaContactPhone: process.env.MEDIA_CONTACT_PHONE || canonical.phone || "",
            logoUrl: process.env.MEDIA_LOGO_URL || "",
            headshotUrl: process.env.MEDIA_HEADSHOT_URL || "",
        },
    });

    return {
        ...created,
        physicianBioSnippets: snippets,
    };
}

export async function updatePrBoilerplate(input: {
    aboutBoilerplate?: string;
    physicianBioSnippets?: unknown;
    mediaContactName?: string | null;
    mediaContactEmail?: string | null;
    mediaContactPhone?: string | null;
    logoUrl?: string | null;
    headshotUrl?: string | null;
}) {
    const current = await getPrBoilerplate();

    const nextSnippets =
        input.physicianBioSnippets === undefined
            ? normalizeSnippets(current.physicianBioSnippets)
            : normalizeSnippets(input.physicianBioSnippets);

    const next = await prisma.prBoilerplate.upsert({
        where: { key: DEFAULT_BOILERPLATE_KEY },
        update: {
            aboutBoilerplate:
                input.aboutBoilerplate === undefined
                    ? current.aboutBoilerplate
                    : normalizeText(input.aboutBoilerplate, 4000) || DEFAULT_ENTITY_SPINE_TEXT,
            physicianBioSnippets: nextSnippets as any,
            mediaContactName:
                input.mediaContactName === undefined
                    ? current.mediaContactName
                    : normalizeOptionalString(input.mediaContactName, 160),
            mediaContactEmail:
                input.mediaContactEmail === undefined
                    ? current.mediaContactEmail
                    : normalizeEmail(input.mediaContactEmail),
            mediaContactPhone:
                input.mediaContactPhone === undefined
                    ? current.mediaContactPhone
                    : normalizeOptionalString(input.mediaContactPhone, 40),
            logoUrl:
                input.logoUrl === undefined
                    ? current.logoUrl
                    : normalizeUrl(input.logoUrl),
            headshotUrl:
                input.headshotUrl === undefined
                    ? current.headshotUrl
                    : normalizeUrl(input.headshotUrl),
        },
        create: {
            key: DEFAULT_BOILERPLATE_KEY,
            aboutBoilerplate: normalizeText(input.aboutBoilerplate || DEFAULT_ENTITY_SPINE_TEXT, 4000),
            physicianBioSnippets: nextSnippets as any,
            mediaContactName: normalizeOptionalString(input.mediaContactName, 160),
            mediaContactEmail: normalizeEmail(input.mediaContactEmail),
            mediaContactPhone: normalizeOptionalString(input.mediaContactPhone, 40),
            logoUrl: normalizeUrl(input.logoUrl),
            headshotUrl: normalizeUrl(input.headshotUrl),
        },
    });

    return {
        ...next,
        physicianBioSnippets: nextSnippets,
    };
}

function buildPressReleasePrompt(input: {
    headlineTopic: string;
    keyFacts: string;
    targetAngle: string;
    boilerplate: string;
    physicianQuoteSeed?: string;
    mediaContactName?: string;
    mediaContactEmail?: string;
    mediaContactPhone?: string;
}) {
    const datelineCity = process.env.PRESS_RELEASE_CITY || "Virtual, USA";
    const dateText = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    const outputShape = {
        headline: "string",
        subheadline: "string",
        datelineCity,
        datelineDate: dateText,
        leadParagraph: "string",
        bodyParagraphs: ["string", "string", "string"],
        physicianQuote: "string",
        aboutBoilerplate: "string",
        mediaContact: {
            name: input.mediaContactName || "Present Health Media Team",
            email: input.mediaContactEmail || "media@presenthealthmd.com",
            phone: input.mediaContactPhone || "",
        },
    };

    return [
        "You are a healthcare public-relations writer drafting a U.S. press release for Present Health, a telehealth-first Direct Primary Care clinic.",
        "Return strict JSON only with no markdown fences.",
        "Write professional, factual, non-hype copy.",
        "Do not provide medical advice.",
        "",
        `Headline topic: ${input.headlineTopic}`,
        `Key facts/announcements: ${input.keyFacts}`,
        `Target angle: ${input.targetAngle}`,
        `Dateline city: ${datelineCity}`,
        `Dateline date: ${dateText}`,
        `Practice boilerplate (must adapt and include): ${input.boilerplate}`,
        input.physicianQuoteSeed ? `Physician quote seed: ${input.physicianQuoteSeed}` : "",
        "",
        "Required structure in JSON fields:",
        "- headline",
        "- subheadline",
        "- datelineCity",
        "- datelineDate",
        "- leadParagraph (who/what/when/where/why)",
        "- bodyParagraphs (3-5 concise paragraphs)",
        "- physicianQuote",
        "- aboutBoilerplate",
        "- mediaContact {name,email,phone}",
        "",
        `Output JSON shape: ${JSON.stringify(outputShape, null, 2)}`,
    ]
        .filter(Boolean)
        .join("\n");
}

function buildFallbackPressRelease(input: {
    headlineTopic: string;
    keyFacts: string;
    targetAngle: string;
    boilerplate: string;
    physicianQuoteSeed?: string;
    mediaContactName?: string;
    mediaContactEmail?: string;
    mediaContactPhone?: string;
}) {
    const date = new Date();
    const dateText = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const city = process.env.PRESS_RELEASE_CITY || "Virtual, USA";

    return {
        headline: `Present Health Announces ${input.headlineTopic}`,
        subheadline: input.targetAngle || "Telehealth-first Direct Primary Care updates from Present Health.",
        datelineCity: city,
        datelineDate: dateText,
        leadParagraph: `${city} — ${dateText} — Present Health announced ${input.headlineTopic}. ${input.keyFacts}`,
        bodyParagraphs: [
            `The announcement focuses on ${input.targetAngle || "expanding access to relationship-based primary care"}.`,
            `Present Health operates a telehealth-first Direct Primary Care model with transparent membership pricing and continuity with the same physician.`,
            `The practice reports that this update supports patients who want simpler, more consistent access to primary care across its served states.`,
        ],
        physicianQuote:
            input.physicianQuoteSeed ||
            "We built Present Health to make primary care more consistent, accessible, and transparent for the people we serve.",
        aboutBoilerplate: input.boilerplate,
        mediaContact: {
            name: input.mediaContactName || "Present Health Media Team",
            email: input.mediaContactEmail || "media@presenthealthmd.com",
            phone: input.mediaContactPhone || "",
        },
    };
}

export async function generatePressReleaseDraft(input: {
    headlineTopic: string;
    keyFacts: string;
    targetAngle: string;
}) {
    const boilerplate = await getPrBoilerplate();
    const physicianQuoteSeed = normalizeSnippets(boilerplate.physicianBioSnippets)[0]?.snippet || "";

    const prompt = buildPressReleasePrompt({
        headlineTopic: input.headlineTopic,
        keyFacts: input.keyFacts,
        targetAngle: input.targetAngle,
        boilerplate: boilerplate.aboutBoilerplate,
        physicianQuoteSeed,
        mediaContactName: boilerplate.mediaContactName || undefined,
        mediaContactEmail: boilerplate.mediaContactEmail || undefined,
        mediaContactPhone: boilerplate.mediaContactPhone || undefined,
    });

    const fallback = buildFallbackPressRelease({
        headlineTopic: input.headlineTopic,
        keyFacts: input.keyFacts,
        targetAngle: input.targetAngle,
        boilerplate: boilerplate.aboutBoilerplate,
        physicianQuoteSeed,
        mediaContactName: boilerplate.mediaContactName || undefined,
        mediaContactEmail: boilerplate.mediaContactEmail || undefined,
        mediaContactPhone: boilerplate.mediaContactPhone || undefined,
    });

    const generation = await runLlmJson(prompt, fallback);
    const parsed = generation.parsed || fallback;

    const bodyParagraphs = normalizeStringArray(parsed.bodyParagraphs, 8, 2000);
    const leadParagraph = normalizeText(parsed.leadParagraph || fallback.leadParagraph, 2500);
    const body = [leadParagraph, ...bodyParagraphs].filter(Boolean).join("\n\n");

    return {
        draft: {
            headlineTopic: normalizeText(input.headlineTopic, 200),
            targetAngle: normalizeText(input.targetAngle, 300),
            keyFacts: normalizeText(input.keyFacts, 6000),
            headline: normalizeText(parsed.headline || fallback.headline, 260),
            subheadline: normalizeOptionalString(parsed.subheadline || fallback.subheadline, 320),
            datelineCity: normalizeOptionalString(parsed.datelineCity || fallback.datelineCity, 160),
            datelineDate:
                parseDate(parsed.datelineDate) || parseDate(fallback.datelineDate) || new Date(),
            leadParagraph,
            body,
            physicianQuote: normalizeOptionalString(parsed.physicianQuote || fallback.physicianQuote, 2000),
            boilerplate: normalizeText(parsed.aboutBoilerplate || fallback.aboutBoilerplate, 4000),
            mediaContactName: normalizeOptionalString(parsed?.mediaContact?.name || boilerplate.mediaContactName, 160),
            mediaContactEmail: normalizeOptionalString(parsed?.mediaContact?.email || boilerplate.mediaContactEmail, 254),
            mediaContactPhone: normalizeOptionalString(parsed?.mediaContact?.phone || boilerplate.mediaContactPhone, 40),
            llmProvider: generation.provider,
            llmModel: generation.model,
            llmPrompt: prompt,
            llmResponse: generation.responseText,
        },
        generation,
    };
}

export async function createPressRelease(input: {
    headlineTopic: string;
    targetAngle?: string | null;
    keyFacts?: string | null;
    headline: string;
    subheadline?: string | null;
    datelineCity?: string | null;
    datelineDate?: Date | null;
    leadParagraph?: string | null;
    body: string;
    physicianQuote?: string | null;
    boilerplate?: string | null;
    mediaContactName?: string | null;
    mediaContactEmail?: string | null;
    mediaContactPhone?: string | null;
    status?: PressReleaseStatus;
    submittedOutlets?: string[];
    publishedUrls?: string[];
    scheduledFor?: Date | null;
    submittedAt?: Date | null;
    publishedAt?: Date | null;
    llmProvider?: string | null;
    llmModel?: string | null;
    llmPrompt?: string | null;
    llmResponse?: string | null;
}) {
    if (!normalizeText(input.headlineTopic, 200)) throw new Error("headlineTopic is required");
    if (!normalizeText(input.headline, 260)) throw new Error("headline is required");
    if (!normalizeText(input.body, 40000)) throw new Error("body is required");

    return prisma.pressRelease.create({
        data: {
            headlineTopic: normalizeText(input.headlineTopic, 200),
            targetAngle: normalizeOptionalString(input.targetAngle, 300),
            keyFacts: normalizeOptionalString(input.keyFacts, 8000),
            headline: normalizeText(input.headline, 260),
            subheadline: normalizeOptionalString(input.subheadline, 320),
            datelineCity: normalizeOptionalString(input.datelineCity, 160),
            datelineDate: input.datelineDate || null,
            leadParagraph: normalizeOptionalString(input.leadParagraph, 4000),
            body: normalizeText(input.body, 60000),
            physicianQuote: normalizeOptionalString(input.physicianQuote, 3000),
            boilerplate: normalizeOptionalString(input.boilerplate, 5000),
            mediaContactName: normalizeOptionalString(input.mediaContactName, 160),
            mediaContactEmail: normalizeOptionalString(input.mediaContactEmail, 254),
            mediaContactPhone: normalizeOptionalString(input.mediaContactPhone, 40),
            status: input.status || PressReleaseStatus.DRAFT,
            submittedOutlets: normalizeStringArray(input.submittedOutlets || [], 100, 160),
            publishedUrls: normalizeStringArray(input.publishedUrls || [], 100, 500),
            scheduledFor: input.scheduledFor || null,
            submittedAt: input.submittedAt || null,
            publishedAt: input.publishedAt || null,
            llmProvider: normalizeOptionalString(input.llmProvider, 40),
            llmModel: normalizeOptionalString(input.llmModel, 120),
            llmPrompt: normalizeOptionalString(input.llmPrompt, 50000),
            llmResponse: normalizeOptionalString(input.llmResponse, 50000),
        },
    });
}

export async function updatePressRelease(id: string, input: {
    headlineTopic?: string;
    targetAngle?: string | null;
    keyFacts?: string | null;
    headline?: string;
    subheadline?: string | null;
    datelineCity?: string | null;
    datelineDate?: Date | null;
    leadParagraph?: string | null;
    body?: string;
    physicianQuote?: string | null;
    boilerplate?: string | null;
    mediaContactName?: string | null;
    mediaContactEmail?: string | null;
    mediaContactPhone?: string | null;
    status?: PressReleaseStatus;
    submittedOutlets?: string[];
    publishedUrls?: string[];
    scheduledFor?: Date | null;
    submittedAt?: Date | null;
    publishedAt?: Date | null;
    llmProvider?: string | null;
    llmModel?: string | null;
    llmPrompt?: string | null;
    llmResponse?: string | null;
}) {
    const updateData: any = {};

    if (input.headlineTopic !== undefined) updateData.headlineTopic = normalizeText(input.headlineTopic, 200);
    if (input.targetAngle !== undefined) updateData.targetAngle = normalizeOptionalString(input.targetAngle, 300);
    if (input.keyFacts !== undefined) updateData.keyFacts = normalizeOptionalString(input.keyFacts, 8000);
    if (input.headline !== undefined) updateData.headline = normalizeText(input.headline, 260);
    if (input.subheadline !== undefined) updateData.subheadline = normalizeOptionalString(input.subheadline, 320);
    if (input.datelineCity !== undefined) updateData.datelineCity = normalizeOptionalString(input.datelineCity, 160);
    if (input.datelineDate !== undefined) updateData.datelineDate = input.datelineDate;
    if (input.leadParagraph !== undefined) updateData.leadParagraph = normalizeOptionalString(input.leadParagraph, 4000);
    if (input.body !== undefined) updateData.body = normalizeText(input.body, 60000);
    if (input.physicianQuote !== undefined) updateData.physicianQuote = normalizeOptionalString(input.physicianQuote, 3000);
    if (input.boilerplate !== undefined) updateData.boilerplate = normalizeOptionalString(input.boilerplate, 5000);
    if (input.mediaContactName !== undefined) updateData.mediaContactName = normalizeOptionalString(input.mediaContactName, 160);
    if (input.mediaContactEmail !== undefined) updateData.mediaContactEmail = normalizeOptionalString(input.mediaContactEmail, 254);
    if (input.mediaContactPhone !== undefined) updateData.mediaContactPhone = normalizeOptionalString(input.mediaContactPhone, 40);
    if (input.status !== undefined) updateData.status = input.status;
    if (input.submittedOutlets !== undefined) updateData.submittedOutlets = normalizeStringArray(input.submittedOutlets, 100, 160);
    if (input.publishedUrls !== undefined) updateData.publishedUrls = normalizeStringArray(input.publishedUrls, 100, 500);
    if (input.scheduledFor !== undefined) updateData.scheduledFor = input.scheduledFor;
    if (input.submittedAt !== undefined) updateData.submittedAt = input.submittedAt;
    if (input.publishedAt !== undefined) updateData.publishedAt = input.publishedAt;
    if (input.llmProvider !== undefined) updateData.llmProvider = normalizeOptionalString(input.llmProvider, 40);
    if (input.llmModel !== undefined) updateData.llmModel = normalizeOptionalString(input.llmModel, 120);
    if (input.llmPrompt !== undefined) updateData.llmPrompt = normalizeOptionalString(input.llmPrompt, 50000);
    if (input.llmResponse !== undefined) updateData.llmResponse = normalizeOptionalString(input.llmResponse, 50000);

    return prisma.pressRelease.update({ where: { id }, data: updateData });
}

export async function listPressReleases(filters?: { status?: PressReleaseStatus | null; q?: string | null; limit?: number }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;

    const q = compactWhitespace(filters?.q || "");
    if (q) {
        where.OR = [
            { headlineTopic: { contains: q, mode: "insensitive" } },
            { headline: { contains: q, mode: "insensitive" } },
            { targetAngle: { contains: q, mode: "insensitive" } },
            { keyFacts: { contains: q, mode: "insensitive" } },
        ];
    }

    const limit = Number.isFinite(filters?.limit)
        ? Math.max(1, Math.min(500, Math.trunc(filters?.limit || 120)))
        : 120;

    return prisma.pressRelease.findMany({
        where,
        orderBy: [{ scheduledFor: "desc" }, { createdAt: "desc" }],
        take: limit,
        include: {
            _count: { select: { mentions: true } },
        },
    });
}

function buildPitchPrompt(input: {
    outletName: string;
    opportunityType: PrOpportunityType;
    contactName?: string;
    storyAngle?: string;
    keyContext?: string;
    brandBoilerplate: string;
}) {
    const typeLabel = PR_OPPORTUNITY_TYPE_LABELS[input.opportunityType];

    return [
        "You are writing a concise, personalized PR outreach email pitch for Present Health.",
        "Return strict JSON only, no markdown.",
        "Tone: warm, physician-led, specific, not salesy.",
        "Do not include medical advice.",
        "",
        `Outlet: ${input.outletName}`,
        `Opportunity type: ${typeLabel}`,
        input.contactName ? `Contact name: ${input.contactName}` : "",
        input.storyAngle ? `Target angle: ${input.storyAngle}` : "",
        input.keyContext ? `Key context: ${input.keyContext}` : "",
        `Brand context: ${input.brandBoilerplate}`,
        "",
        "Output JSON fields:",
        "- subject",
        "- emailBody",
        "- followUpSubject",
        "- followUpBody",
    ]
        .filter(Boolean)
        .join("\n");
}

function buildFallbackPitch(input: {
    outletName: string;
    opportunityType: PrOpportunityType;
    contactName?: string;
    storyAngle?: string;
}) {
    const typeLabel = PR_OPPORTUNITY_TYPE_LABELS[input.opportunityType];
    const contact = input.contactName || "there";
    return {
        subject: `Story idea for ${input.outletName}: telehealth-first Direct Primary Care`,
        emailBody: [
            `Hi ${contact},`,
            "",
            `I am reaching out from Present Health with a potential ${typeLabel.toLowerCase()} angle that may be useful for your audience.`,
            input.storyAngle
                ? `The core angle is: ${input.storyAngle}.`
                : "We can share practical insights on telehealth-first Direct Primary Care, continuity with the same physician, and transparent membership pricing.",
            "",
            "If this is a fit, I can share a concise outline and physician availability for an interview or quote.",
            "",
            "Best,",
            "Present Health",
        ].join("\n"),
        followUpSubject: `Following up: Present Health story idea for ${input.outletName}`,
        followUpBody: [
            `Hi ${contact},`,
            "",
            "Following up in case this story angle is relevant for your upcoming coverage.",
            "Happy to send supporting details or coordinate a quick call.",
            "",
            "Best,",
            "Present Health",
        ].join("\n"),
    };
}

export async function generateOpportunityPitch(input: {
    outletName: string;
    opportunityType: PrOpportunityType;
    contactName?: string;
    storyAngle?: string;
    keyContext?: string;
}) {
    const boilerplate = await getPrBoilerplate();
    const prompt = buildPitchPrompt({
        outletName: input.outletName,
        opportunityType: input.opportunityType,
        contactName: input.contactName,
        storyAngle: input.storyAngle,
        keyContext: input.keyContext,
        brandBoilerplate: boilerplate.aboutBoilerplate,
    });

    const fallback = buildFallbackPitch(input);
    const generation = await runLlmJson(prompt, fallback);
    const parsed = generation.parsed || fallback;

    return {
        subject: normalizeText(parsed.subject || fallback.subject, 220),
        emailBody: normalizeText(parsed.emailBody || fallback.emailBody, 8000),
        followUpSubject: normalizeText(parsed.followUpSubject || fallback.followUpSubject, 220),
        followUpBody: normalizeText(parsed.followUpBody || fallback.followUpBody, 8000),
        llmProvider: generation.provider,
        llmModel: generation.model,
        llmPrompt: prompt,
        llmResponse: generation.responseText,
    };
}

export async function listOpportunities(filters?: {
    pitchStatus?: PrPitchStatus | null;
    opportunityType?: PrOpportunityType | null;
    q?: string | null;
    limit?: number;
}) {
    const where: any = {};
    if (filters?.pitchStatus) where.pitchStatus = filters.pitchStatus;
    if (filters?.opportunityType) where.opportunityType = filters.opportunityType;

    const q = compactWhitespace(filters?.q || "");
    if (q) {
        where.OR = [
            { outletName: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
            { contactEmail: { contains: q, mode: "insensitive" } },
            { pitchText: { contains: q, mode: "insensitive" } },
        ];
    }

    const limit = Number.isFinite(filters?.limit)
        ? Math.max(1, Math.min(500, Math.trunc(filters?.limit || 150)))
        : 150;

    return prisma.prOpportunity.findMany({
        where,
        orderBy: [{ date: "asc" }, { createdAt: "desc" }],
        take: limit,
        include: {
            _count: { select: { mentions: true } },
        },
    });
}

export async function createOpportunity(input: {
    opportunityType: PrOpportunityType;
    outletName: string;
    contactName?: string | null;
    contactEmail?: string | null;
    pitchStatus?: PrPitchStatus;
    pitchText?: string | null;
    resultUrl?: string | null;
    date?: Date | null;
    notes?: string | null;
    llmProvider?: string | null;
    llmModel?: string | null;
    llmPrompt?: string | null;
    llmResponse?: string | null;
}) {
    if (!input.opportunityType) throw new Error("opportunityType is required");
    if (!normalizeText(input.outletName, 200)) throw new Error("outletName is required");

    return prisma.prOpportunity.create({
        data: {
            opportunityType: input.opportunityType,
            outletName: normalizeText(input.outletName, 200),
            contactName: normalizeOptionalString(input.contactName, 160),
            contactEmail: normalizeOptionalString(input.contactEmail, 254),
            pitchStatus: input.pitchStatus || PrPitchStatus.IDENTIFIED,
            pitchText: normalizeOptionalString(input.pitchText, 12000),
            resultUrl: normalizeUrl(input.resultUrl),
            date: input.date || null,
            notes: normalizeOptionalString(input.notes, 4000),
            llmProvider: normalizeOptionalString(input.llmProvider, 40),
            llmModel: normalizeOptionalString(input.llmModel, 120),
            llmPrompt: normalizeOptionalString(input.llmPrompt, 50000),
            llmResponse: normalizeOptionalString(input.llmResponse, 50000),
        },
    });
}

export async function updateOpportunity(id: string, input: {
    opportunityType?: PrOpportunityType;
    outletName?: string;
    contactName?: string | null;
    contactEmail?: string | null;
    pitchStatus?: PrPitchStatus;
    pitchText?: string | null;
    resultUrl?: string | null;
    date?: Date | null;
    notes?: string | null;
    llmProvider?: string | null;
    llmModel?: string | null;
    llmPrompt?: string | null;
    llmResponse?: string | null;
}) {
    const updateData: any = {};
    if (input.opportunityType !== undefined) updateData.opportunityType = input.opportunityType;
    if (input.outletName !== undefined) updateData.outletName = normalizeText(input.outletName, 200);
    if (input.contactName !== undefined) updateData.contactName = normalizeOptionalString(input.contactName, 160);
    if (input.contactEmail !== undefined) updateData.contactEmail = normalizeOptionalString(input.contactEmail, 254);
    if (input.pitchStatus !== undefined) updateData.pitchStatus = input.pitchStatus;
    if (input.pitchText !== undefined) updateData.pitchText = normalizeOptionalString(input.pitchText, 12000);
    if (input.resultUrl !== undefined) updateData.resultUrl = normalizeUrl(input.resultUrl);
    if (input.date !== undefined) updateData.date = input.date;
    if (input.notes !== undefined) updateData.notes = normalizeOptionalString(input.notes, 4000);
    if (input.llmProvider !== undefined) updateData.llmProvider = normalizeOptionalString(input.llmProvider, 40);
    if (input.llmModel !== undefined) updateData.llmModel = normalizeOptionalString(input.llmModel, 120);
    if (input.llmPrompt !== undefined) updateData.llmPrompt = normalizeOptionalString(input.llmPrompt, 50000);
    if (input.llmResponse !== undefined) updateData.llmResponse = normalizeOptionalString(input.llmResponse, 50000);

    return prisma.prOpportunity.update({ where: { id }, data: updateData });
}

export async function listMentions(filters?: { mentionType?: PrMentionType | null; q?: string | null; limit?: number }) {
    const where: any = {};
    if (filters?.mentionType) where.mentionType = filters.mentionType;

    const q = compactWhitespace(filters?.q || "");
    if (q) {
        where.OR = [
            { title: { contains: q, mode: "insensitive" } },
            { sourceName: { contains: q, mode: "insensitive" } },
            { url: { contains: q, mode: "insensitive" } },
            { notes: { contains: q, mode: "insensitive" } },
        ];
    }

    const limit = Number.isFinite(filters?.limit)
        ? Math.max(1, Math.min(500, Math.trunc(filters?.limit || 200)))
        : 200;

    return prisma.prMention.findMany({
        where,
        orderBy: [{ mentionDate: "desc" }, { createdAt: "desc" }],
        take: limit,
        include: {
            pressRelease: {
                select: { id: true, headline: true, status: true },
            },
            opportunity: {
                select: { id: true, outletName: true, opportunityType: true },
            },
        },
    });
}

export async function createMention(input: {
    mentionType: PrMentionType;
    title: string;
    sourceName?: string | null;
    url: string;
    mentionDate: Date;
    notes?: string | null;
    pressReleaseId?: string | null;
    opportunityId?: string | null;
}) {
    if (!input.mentionType) throw new Error("mentionType is required");
    if (!normalizeText(input.title, 260)) throw new Error("title is required");
    const normalizedUrl = normalizeUrl(input.url);
    if (!normalizedUrl) throw new Error("url is required");

    return prisma.prMention.create({
        data: {
            mentionType: input.mentionType,
            title: normalizeText(input.title, 260),
            sourceName: normalizeOptionalString(input.sourceName, 160),
            url: normalizedUrl,
            mentionDate: input.mentionDate,
            notes: normalizeOptionalString(input.notes, 4000),
            pressReleaseId: normalizeOptionalString(input.pressReleaseId, 64),
            opportunityId: normalizeOptionalString(input.opportunityId, 64),
        },
        include: {
            pressRelease: {
                select: { id: true, headline: true, status: true },
            },
            opportunity: {
                select: { id: true, outletName: true, opportunityType: true },
            },
        },
    });
}

export async function updateMention(id: string, input: {
    mentionType?: PrMentionType;
    title?: string;
    sourceName?: string | null;
    url?: string;
    mentionDate?: Date;
    notes?: string | null;
    pressReleaseId?: string | null;
    opportunityId?: string | null;
}) {
    const updateData: any = {};
    if (input.mentionType !== undefined) updateData.mentionType = input.mentionType;
    if (input.title !== undefined) updateData.title = normalizeText(input.title, 260);
    if (input.sourceName !== undefined) updateData.sourceName = normalizeOptionalString(input.sourceName, 160);
    if (input.url !== undefined) updateData.url = normalizeUrl(input.url);
    if (input.mentionDate !== undefined) updateData.mentionDate = input.mentionDate;
    if (input.notes !== undefined) updateData.notes = normalizeOptionalString(input.notes, 4000);
    if (input.pressReleaseId !== undefined) updateData.pressReleaseId = normalizeOptionalString(input.pressReleaseId, 64);
    if (input.opportunityId !== undefined) updateData.opportunityId = normalizeOptionalString(input.opportunityId, 64);

    return prisma.prMention.update({
        where: { id },
        data: updateData,
        include: {
            pressRelease: {
                select: { id: true, headline: true, status: true },
            },
            opportunity: {
                select: { id: true, outletName: true, opportunityType: true },
            },
        },
    });
}

async function getBrandSearchDelta() {
    const hasCredentials = Boolean(
        process.env.GSC_SERVICE_ACCOUNT_JSON ||
        process.env.GSC_SERVICE_ACCOUNT_KEY ||
        process.env.GSC_SERVICE_ACCOUNT_BASE64 ||
        process.env.GSC_SERVICE_ACCOUNT_PATH
    );
    if (!hasCredentials) return null;

    try {
        const auth = buildGscAuth();
        const searchconsole = google.searchconsole({ version: "v1", auth });
        const siteUrl = getGscSiteUrl();

        const now = new Date();
        const currentEnd = subDays(now, 1);
        const currentStart = subDays(currentEnd, 29);
        const previousEnd = subDays(currentStart, 1);
        const previousStart = subDays(previousEnd, 29);

        const queryRange = async (startDate: Date, endDate: Date) => {
            const res = await searchconsole.searchanalytics.query({
                siteUrl,
                requestBody: {
                    startDate: startDate.toISOString().slice(0, 10),
                    endDate: endDate.toISOString().slice(0, 10),
                    rowLimit: 250,
                    dimensions: ["query"],
                    dimensionFilterGroups: [
                        {
                            groupType: "and",
                            filters: [
                                {
                                    dimension: "query",
                                    operator: "contains",
                                    expression: "present health",
                                },
                            ],
                        },
                    ],
                },
            });

            const rows = res.data?.rows || [];
            return rows.reduce<{ clicks: number; impressions: number }>(
                (acc, row) => {
                    return {
                        clicks: acc.clicks + Number(row.clicks || 0),
                        impressions: acc.impressions + Number(row.impressions || 0),
                    };
                },
                { clicks: 0, impressions: 0 }
            );
        };

        const [current, previous] = await Promise.all([
            queryRange(currentStart, currentEnd),
            queryRange(previousStart, previousEnd),
        ]);

        const clicksDelta = current.clicks - previous.clicks;
        const impressionsDelta = current.impressions - previous.impressions;
        const clicksDeltaPct = previous.clicks > 0 ? (clicksDelta / previous.clicks) * 100 : null;
        const impressionsDeltaPct = previous.impressions > 0 ? (impressionsDelta / previous.impressions) * 100 : null;

        return {
            source: "google_search_console",
            current,
            previous,
            clicksDelta,
            impressionsDelta,
            clicksDeltaPct,
            impressionsDeltaPct,
            window: {
                currentStart: currentStart.toISOString().slice(0, 10),
                currentEnd: currentEnd.toISOString().slice(0, 10),
                previousStart: previousStart.toISOString().slice(0, 10),
                previousEnd: previousEnd.toISOString().slice(0, 10),
            },
        };
    } catch (error) {
        console.error("[pr] Failed to fetch branded search delta", error);
        return null;
    }
}

function buildGscAuth() {
    const raw =
        process.env.GSC_SERVICE_ACCOUNT_JSON ||
        process.env.GSC_SERVICE_ACCOUNT_KEY ||
        (process.env.GSC_SERVICE_ACCOUNT_BASE64
            ? Buffer.from(process.env.GSC_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8")
            : undefined);

    if (raw) {
        const parsed = JSON.parse(raw);
        return new google.auth.JWT({
            email: parsed.client_email,
            key: parsed.private_key,
            scopes: [
                "https://www.googleapis.com/auth/webmasters",
                "https://www.googleapis.com/auth/webmasters.readonly",
            ],
        });
    }

    const path = process.env.GSC_SERVICE_ACCOUNT_PATH;
    if (!path) throw new Error("Missing Search Console service account credentials");

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require("fs");
    const parsed = JSON.parse(fs.readFileSync(path, "utf8"));
    return new google.auth.JWT({
        email: parsed.client_email,
        key: parsed.private_key,
        scopes: [
            "https://www.googleapis.com/auth/webmasters",
            "https://www.googleapis.com/auth/webmasters.readonly",
        ],
    });
}

function getGscSiteUrl() {
    const siteUrl = process.env.GSC_SITE_URL || process.env.NEXTAUTH_URL || process.env.SITE_URL;
    if (!siteUrl) throw new Error("Missing GSC_SITE_URL (or NEXTAUTH_URL/SITE_URL fallback)");
    return siteUrl;
}

function monthTopicTheme(monthIndex: number) {
    const themes = [
        "New-year preventive care planning",
        "Heart-health and preventive screening awareness",
        "Spring wellness routines and chronic-care check-ins",
        "HSA and tax-season healthcare planning",
        "Summer travel care and virtual visit readiness",
        "Back-to-school family care planning",
        "Employer benefits and mid-year plan optimization",
        "Preventive care checklists for fall",
        "Open enrollment and HSA strategy education",
        "Flu-season telehealth readiness",
        "Year-end care continuity and chronic-condition follow-ups",
        "Annual health planning and DPC value recap",
    ];
    return themes[(monthIndex + 12) % 12];
}

function buildMonthlySuggestions(input: {
    startMonth: Date;
    activeStates: string[];
    totalMembersEstimate: number;
}) {
    const out: Array<{ month: string; topics: string[] }> = [];

    for (let i = 0; i < 6; i += 1) {
        const d = new Date(Date.UTC(input.startMonth.getUTCFullYear(), input.startMonth.getUTCMonth() + i, 1));
        const monthLabel = d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
        const seasonal = monthTopicTheme(d.getUTCMonth());
        const stateTopic =
            input.activeStates.length > 0
                ? `State expansion spotlight: care availability updates for ${input.activeStates.slice(0, 3).join(", ")}${input.activeStates.length > 3 ? " and more" : ""}`
                : "State availability spotlight and telehealth regulations update";

        const milestoneTopic =
            input.totalMembersEstimate >= 250
                ? "Member milestone update: progress to next physician threshold"
                : "Member experience milestone: continuity and care access outcomes";

        out.push({
            month: monthLabel,
            topics: [
                `${seasonal}: why it matters for patients and employers`,
                "DPC industry update and telehealth policy trend commentary",
                "HSA/benefits planning and transparent primary-care pricing education",
                stateTopic,
                milestoneTopic,
            ],
        });
    }

    return out;
}

export async function getPrDashboard() {
    const now = new Date();
    const currentMonthStart = monthStart(now);
    const currentMonthEnd = monthEnd(now);

    const [pressReleases, opportunities, mentions, activeStates] = await Promise.all([
        prisma.pressRelease.findMany({
            orderBy: [{ scheduledFor: "desc" }, { createdAt: "desc" }],
            include: {
                _count: { select: { mentions: true } },
            },
            take: 500,
        }),
        prisma.prOpportunity.findMany({
            orderBy: [{ date: "asc" }, { createdAt: "desc" }],
            include: {
                _count: { select: { mentions: true } },
            },
            take: 500,
        }),
        prisma.prMention.findMany({
            orderBy: [{ mentionDate: "desc" }, { createdAt: "desc" }],
            include: {
                pressRelease: { select: { id: true, headline: true, status: true } },
                opportunity: { select: { id: true, outletName: true, opportunityType: true } },
            },
            take: 500,
        }),
        prisma.state.findMany({
            where: { isActive: true },
            select: { name: true },
            orderBy: { name: "asc" },
            take: 20,
        }),
    ]);

    const efforts = {
        pressReleasesSent: pressReleases.filter((x) => x.status === PressReleaseStatus.SUBMITTED || x.status === PressReleaseStatus.PUBLISHED).length,
        pitchesMade: opportunities.filter((x) => x.pitchStatus !== PrPitchStatus.IDENTIFIED).length,
        opportunitiesIdentified: opportunities.filter((x) => x.pitchStatus === PrPitchStatus.IDENTIFIED).length,
    };

    const results = {
        mentions: mentions.length,
        backlinks: mentions.filter((x) => x.mentionType === PrMentionType.BACKLINK).length,
        podcastAppearances: mentions.filter((x) => x.mentionType === PrMentionType.PODCAST_APPEARANCE).length,
    };

    const currentMonthScheduledCount = pressReleases.filter((release) => {
        const date = release.scheduledFor || release.datelineDate || release.publishedAt || release.createdAt;
        return date >= currentMonthStart && date <= currentMonthEnd;
    }).length;

    const noPressReleaseScheduledThisMonth = currentMonthScheduledCount === 0;

    const pressReleaseMentionRollup = pressReleases.map((release) => {
        const mentionCount = mentions.filter((mention) => mention.pressReleaseId === release.id).length;
        return {
            id: release.id,
            headline: release.headline,
            status: release.status,
            mentionCount,
            submittedOutletsCount: release.submittedOutlets.length,
            publishedUrlsCount: release.publishedUrls.length,
        };
    });

    const totalMembersEstimate = 99 + pressReleases.length + mentions.length;
    const suggestions = buildMonthlySuggestions({
        startMonth: currentMonthStart,
        activeStates: activeStates.map((x) => x.name),
        totalMembersEstimate,
    });

    const brandedSearch = await getBrandSearchDelta();

    return {
        generatedAt: new Date().toISOString(),
        efforts,
        results,
        noPressReleaseScheduledThisMonth,
        currentMonthScheduledCount,
        pressReleaseMentionRollup,
        suggestions,
        brandedSearch,
        calendar: {
            pressReleases: pressReleases.map((release) => ({
                id: release.id,
                headline: release.headline,
                status: release.status,
                date:
                    (release.scheduledFor || release.datelineDate || release.publishedAt || release.createdAt).toISOString(),
                submittedOutletsCount: release.submittedOutlets.length,
                publishedUrlsCount: release.publishedUrls.length,
            })),
            opportunities: opportunities.map((opportunity) => ({
                id: opportunity.id,
                outletName: opportunity.outletName,
                opportunityType: opportunity.opportunityType,
                pitchStatus: opportunity.pitchStatus,
                date: opportunity.date ? opportunity.date.toISOString() : null,
            })),
        },
    };
}

export async function getPrReferenceData() {
    const [pressReleases, opportunities] = await Promise.all([
        prisma.pressRelease.findMany({
            orderBy: { createdAt: "desc" },
            take: 300,
            select: {
                id: true,
                headline: true,
                status: true,
                datelineDate: true,
                scheduledFor: true,
            },
        }),
        prisma.prOpportunity.findMany({
            orderBy: { createdAt: "desc" },
            take: 300,
            select: {
                id: true,
                outletName: true,
                opportunityType: true,
                pitchStatus: true,
                date: true,
            },
        }),
    ]);

    return {
        pressReleases,
        opportunities,
        enums: {
            pressReleaseStatus: Object.values(PressReleaseStatus),
            opportunityType: Object.values(PrOpportunityType),
            pitchStatus: Object.values(PrPitchStatus),
            mentionType: Object.values(PrMentionType),
        },
        labels: {
            pressReleaseStatus: PRESS_RELEASE_STATUS_LABELS,
            opportunityType: PR_OPPORTUNITY_TYPE_LABELS,
            pitchStatus: PR_PITCH_STATUS_LABELS,
            mentionType: PR_MENTION_TYPE_LABELS,
        },
    };
}

export const parsePrEnums = {
    pressReleaseStatus: parsePressReleaseStatus,
    opportunityType: parseOpportunityType,
    pitchStatus: parsePitchStatus,
    mentionType: parseMentionType,
};

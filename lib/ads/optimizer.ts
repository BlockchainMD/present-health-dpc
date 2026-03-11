import OpenAI from "openai";

import { prisma } from "@/lib/prisma";
import { redactSensitive } from "@/lib/ai/redact";
import { validateContent } from "@/lib/ads/compliance";
import { validateRsaDescriptions, validateRsaHeadlines } from "@/lib/ai/validators";
import { getFullPromptContext } from "@/lib/ads/brand-context";
import { generateAdPlan } from "@/lib/ads/google-ads";
import { summarizeExperimentMemory, type ExperimentMemorySummary } from "@/lib/ads/optimization-memory";
import type { AdPlan, CampaignSpec } from "@/lib/ads/types";

const HEADLINE_LIMIT = 15;
const DESCRIPTION_LIMIT = 4;

type CampaignGenerationInput = CampaignSpec & {
    id?: string;
    proofPoints?: string[];
};

function sanitizeText(text: string) {
    return text
        .replace(/\s*\(\[[^\]]+\]\[[^\]]+\]\)/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^["'`]+|["'`]+$/g, "");
}

function parseJsonObject(text: string | null | undefined): Record<string, unknown> {
    if (!text) return {};
    const trimmed = text.trim();

    try {
        return JSON.parse(trimmed);
    } catch {
        const firstBrace = trimmed.indexOf("{");
        const lastBrace = trimmed.lastIndexOf("}");
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            try {
                return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
            } catch {
                return {};
            }
        }
        return {};
    }
}

function dedupeTexts(items: string[], maxLength: number, context: "Headline" | "Description") {
    const unique: string[] = [];
    const seen = new Set<string>();

    for (const item of items) {
        const text = sanitizeText(item);
        if (!text) continue;
        if (text.length > maxLength) continue;
        if (validateContent(text, context).status === "FAIL") continue;

        const key = text.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(text);
    }

    return unique;
}

function buildMetaPrimaryText(descriptions: string[], fallback: string) {
    const candidates = descriptions.filter(Boolean);
    if (candidates.length === 0) return fallback;
    const joined = candidates.slice(0, 2).join(" ");
    return joined.length <= 125 ? joined : candidates[0];
}

function buildCampaignContext(campaign: CampaignGenerationInput) {
    const benefits = Array.isArray(campaign.benefits) ? campaign.benefits.join(", ") : "";
    const proofPoints = Array.isArray(campaign.proofPoints) ? campaign.proofPoints.join(", ") : "";
    const seedKeywords = Array.isArray(campaign.seedKeywords) ? campaign.seedKeywords.join(", ") : "";

    return [
        `Persona: ${redactSensitive(campaign.persona || "")}`,
        `Intent: ${redactSensitive(campaign.intent || "")}`,
        `Benefits: ${redactSensitive(benefits)}`,
        `Proof points: ${redactSensitive(proofPoints)}`,
        `Seed keywords: ${redactSensitive(seedKeywords)}`,
        `Tone: ${redactSensitive(campaign.tone || "")}`,
        `Strategy: ${campaign.strategy || "TRANSACTIONAL"}`,
    ].join("\n");
}

async function requestStructuredCopy(
    openai: OpenAI,
    {
        label,
        schemaKey,
        maxChars,
        targetCount,
        campaignContext,
        performanceMemory,
        extraInstructions,
    }: {
        label: "headlines" | "descriptions";
        schemaKey: "headlines" | "descriptions";
        maxChars: number;
        targetCount: number;
        campaignContext: string;
        performanceMemory: string;
        extraInstructions: string;
    }
) {
    const prompt = `
You are generating only Google Responsive Search Ad ${label} for Present Health.

${getFullPromptContext()}

${performanceMemory}

CAMPAIGN CONTEXT
${campaignContext}

TASK
- Return exactly ${targetCount} unique ${label}.
- Each ${label === "headlines" ? "headline" : "description"} must be ${maxChars} characters or fewer.
- Keep the copy specific, concrete, and conversion-oriented.
- Do not repeat prior copy verbatim.
- Avoid generic filler language.
${extraInstructions}

OUTPUT
Return JSON only:
{ "${schemaKey}": ["...", "..."] }
    `.trim();

    const requestOptions = {
        model: "gpt-5.2",
        reasoning_effort: "medium",
        messages: [
            {
                role: "developer",
                content:
                    label === "headlines"
                        ? "You are an expert paid-search headline writer. You care about novelty, specificity, and character limits."
                        : "You are an expert paid-search description writer. You care about clarity, specificity, and character limits.",
            },
            {
                role: "user",
                content: prompt,
            },
        ],
        response_format: { type: "json_object" },
    } satisfies Parameters<typeof openai.chat.completions.create>[0];

    const response = await openai.chat.completions.create(requestOptions);

    const payload = parseJsonObject(response.choices[0]?.message?.content);
    const values = Array.isArray(payload[schemaKey]) ? payload[schemaKey] : [];
    return values.map((value) => String(value || ""));
}

export async function getCampaignExperimentSummary(campaignId?: string | null): Promise<ExperimentMemorySummary | null> {
    if (!campaignId) return null;

    const runs = await prisma.campaignRun.findMany({
        where: { campaignId },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
            createdAt: true,
            status: true,
            googleCampaignId: true,
            metaCampaignId: true,
            rsaHeadlines: true,
            rsaDescriptions: true,
            metrics: true,
        },
    });

    return summarizeExperimentMemory(runs);
}

export async function generateOptimizedAdPlan(campaign: CampaignGenerationInput): Promise<AdPlan> {
    const baseline = generateAdPlan(campaign);
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return baseline;
    }

    const performanceMemory = await getCampaignExperimentSummary(campaign.id);
    const openai = new OpenAI({ apiKey });
    const campaignContext = buildCampaignContext(campaign);
    const performanceContext = performanceMemory
        ? `PERFORMANCE MEMORY\n${performanceMemory.promptText}`
        : "PERFORMANCE MEMORY\nNo live historical ad data is available yet. Prioritize strong differentiation and coverage across multiple angles.";

    try {
        const [headlineCandidates, descriptionCandidates] = await Promise.all([
            requestStructuredCopy(openai, {
                label: "headlines",
                schemaKey: "headlines",
                maxChars: 30,
                targetCount: 12,
                campaignContext,
                performanceMemory: performanceContext,
                extraInstructions:
                    "- Mix messaging access, convenience, pricing, trust, and direct CTA angles.\n- Headlines should feel punchy and varied.",
            }),
            requestStructuredCopy(openai, {
                label: "descriptions",
                schemaKey: "descriptions",
                maxChars: 90,
                targetCount: 4,
                campaignContext,
                performanceMemory: performanceContext,
                extraInstructions:
                    "- Each description should highlight a distinct reason to click.\n- Use plain English and make the offer easy to understand.",
            }),
        ]);

        const validatedHeadlines = dedupeTexts(
            [...headlineCandidates, ...baseline.rsa.headlines],
            30,
            "Headline"
        );
        const validatedDescriptions = dedupeTexts(
            [...descriptionCandidates, ...baseline.rsa.descriptions],
            90,
            "Description"
        );

        const headlines = validatedHeadlines.slice(0, HEADLINE_LIMIT);
        const descriptions = validatedDescriptions.slice(0, DESCRIPTION_LIMIT);

        const headlineValidation = validateRsaHeadlines(headlines);
        const descriptionValidation = validateRsaDescriptions(descriptions);

        if (!headlineValidation.ok || !descriptionValidation.ok) {
            return baseline;
        }

        return {
            ...baseline,
            rsa: {
                headlines,
                descriptions,
            },
            meta: {
                ...baseline.meta,
                headline: headlines[0] || baseline.meta?.headline || baseline.rsa.headlines[0],
                description: descriptions[0] || baseline.meta?.description || baseline.rsa.descriptions[0],
                primaryText: buildMetaPrimaryText(
                    descriptions,
                    baseline.meta?.primaryText || baseline.rsa.descriptions[0] || ""
                ),
            },
        };
    } catch (error) {
        console.error("[AdOptimizer] Falling back to baseline ad plan:", error);
        return baseline;
    }
}

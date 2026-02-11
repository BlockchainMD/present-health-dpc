import crypto from "crypto";

import OpenAI from "openai";
import { ReviewPlatform, ReviewResponseStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const REVIEW_REQUEST_CONFIG_KEY = "reviews:request_platform_config";
const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export const REVIEW_PLATFORM_LABELS: Record<ReviewPlatform, string> = {
    GOOGLE: "Google",
    YELP: "Yelp",
    HEALTHGRADES: "Healthgrades",
    ZOCDOC: "Zocdoc",
    FACEBOOK: "Facebook",
    OTHER: "Other",
};

export type ReviewRequestConfig = {
    googleUrl: string;
    yelpUrl: string;
    healthgradesUrl: string;
    zocdocUrl: string;
    facebookUrl: string;
    otherLabel: string;
    otherUrl: string;
};

export type ParsedBulkReviewInput = {
    items: Array<{
        platform: ReviewPlatform;
        reviewerName: string;
        rating: number;
        reviewText: string;
        reviewDate: Date;
        reviewUrl: string | null;
    }>;
    errors: string[];
};

function compactWhitespace(value: string) {
    return value.trim().replace(/\s+/g, " ");
}

function normalizeOptionalUrl(value: string | null | undefined) {
    const raw = compactWhitespace(String(value || ""));
    if (!raw) return "";
    return raw;
}

function parseDateLoose(value: string | null | undefined) {
    const raw = compactWhitespace(String(value || ""));
    if (!raw) return null;

    const parsed = new Date(raw);
    if (Number.isFinite(parsed.getTime())) return parsed;

    const mdy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (mdy) {
        const mm = Number.parseInt(mdy[1], 10);
        const dd = Number.parseInt(mdy[2], 10);
        const yyRaw = Number.parseInt(mdy[3], 10);
        const yy = yyRaw < 100 ? 2000 + yyRaw : yyRaw;
        const alt = new Date(yy, mm - 1, dd);
        if (Number.isFinite(alt.getTime())) return alt;
    }

    return null;
}

function clampRating(value: unknown) {
    const n = typeof value === "number" ? value : Number.parseInt(String(value || ""), 10);
    if (!Number.isFinite(n)) return null;
    const rounded = Math.round(n);
    if (rounded < 1 || rounded > 5) return null;
    return rounded;
}

export function parseReviewPlatform(input: unknown): ReviewPlatform {
    const raw = compactWhitespace(String(input || "")).toUpperCase();
    if (!raw) return ReviewPlatform.OTHER;
    if (raw === "GOOGLE") return ReviewPlatform.GOOGLE;
    if (raw === "YELP") return ReviewPlatform.YELP;
    if (raw === "HEALTHGRADES") return ReviewPlatform.HEALTHGRADES;
    if (raw === "ZOCDOC") return ReviewPlatform.ZOCDOC;
    if (raw === "FACEBOOK") return ReviewPlatform.FACEBOOK;

    if (raw.includes("GOOGLE")) return ReviewPlatform.GOOGLE;
    if (raw.includes("YELP")) return ReviewPlatform.YELP;
    if (raw.includes("HEALTH")) return ReviewPlatform.HEALTHGRADES;
    if (raw.includes("ZOCDOC") || raw.includes("ZOCDOC")) return ReviewPlatform.ZOCDOC;
    if (raw.includes("FACEBOOK") || raw.includes("META")) return ReviewPlatform.FACEBOOK;

    return ReviewPlatform.OTHER;
}

function parseLineField(line: string) {
    const m = line.match(/^\s*([a-zA-Z _-]+)\s*:\s*(.*)$/);
    if (!m) return null;
    return {
        key: compactWhitespace(m[1]).toLowerCase(),
        value: m[2] || "",
    };
}

function maybeParsePipeHeader(blockLines: string[]) {
    if (!blockLines.length) return null;
    const first = compactWhitespace(blockLines[0] || "");
    if (!first.includes("|")) return null;
    const parts = first.split("|").map((x) => compactWhitespace(x)).filter(Boolean);
    if (parts.length < 2) return null;

    const platform = parseReviewPlatform(parts[0]);
    let reviewerName = "";
    let rating: number | null = null;
    let reviewDate: Date | null = null;

    for (const part of parts.slice(1)) {
        if (!rating) {
            const starMatch = part.match(/(\d(?:\.\d+)?)\s*(?:\/\s*5|stars?|⭐)/i);
            if (starMatch) {
                rating = clampRating(starMatch[1]);
                continue;
            }
            const justInt = clampRating(part);
            if (justInt) {
                rating = justInt;
                continue;
            }
        }

        if (!reviewDate) {
            const maybeDate = parseDateLoose(part);
            if (maybeDate) {
                reviewDate = maybeDate;
                continue;
            }
        }

        if (!reviewerName) reviewerName = part;
    }

    if (!reviewerName || !rating) return null;

    return {
        platform,
        reviewerName,
        rating,
        reviewDate,
        consumedFirstLine: true,
    };
}

export function parseBulkReviewImport(rawInput: string, fallbackPlatform?: ReviewPlatform): ParsedBulkReviewInput {
    const raw = String(rawInput || "").replace(/\r\n/g, "\n");
    const blocks = raw
        .split(/\n\s*---+\s*\n|\n\s*===+\s*\n|\n{2,}/g)
        .map((x) => x.trim())
        .filter(Boolean);

    const items: ParsedBulkReviewInput["items"] = [];
    const errors: string[] = [];

    for (let i = 0; i < blocks.length; i += 1) {
        const block = blocks[i];
        const lines = block.split("\n").map((x) => x.trim()).filter(Boolean);
        if (!lines.length) continue;

        let platform = fallbackPlatform || ReviewPlatform.OTHER;
        let reviewerName = "";
        let rating: number | null = null;
        let reviewDate: Date | null = null;
        let reviewUrl: string | null = null;

        let startLine = 0;
        const header = maybeParsePipeHeader(lines);
        if (header) {
            platform = header.platform;
            reviewerName = header.reviewerName;
            rating = header.rating;
            reviewDate = header.reviewDate;
            startLine = header.consumedFirstLine ? 1 : 0;
        }

        const reviewTextLines: string[] = [];
        let inText = false;

        for (let j = startLine; j < lines.length; j += 1) {
            const line = lines[j];
            const field = parseLineField(line);
            if (field) {
                const key = field.key;
                const value = compactWhitespace(field.value || "");

                if (key === "platform") {
                    platform = parseReviewPlatform(value);
                    continue;
                }
                if (key === "reviewer" || key === "reviewer name" || key === "name") {
                    reviewerName = value;
                    continue;
                }
                if (key === "rating" || key === "stars" || key === "star") {
                    const parsedRating = clampRating(value.match(/\d+/)?.[0] || value);
                    if (parsedRating) rating = parsedRating;
                    continue;
                }
                if (key === "date" || key === "review date") {
                    const parsedDate = parseDateLoose(value);
                    if (parsedDate) reviewDate = parsedDate;
                    continue;
                }
                if (key === "url" || key === "review url" || key === "link") {
                    reviewUrl = value || null;
                    continue;
                }
                if (key === "review" || key === "text" || key === "review text") {
                    inText = true;
                    if (value) reviewTextLines.push(value);
                    continue;
                }
            }

            if (inText || !parseLineField(line)) {
                reviewTextLines.push(line);
            }
        }

        const reviewText = compactWhitespace(reviewTextLines.join(" "));

        if (!reviewerName || !rating || !reviewText) {
            errors.push(
                `Block ${i + 1}: missing required fields (reviewer_name, rating 1-5, review_text).`
            );
            continue;
        }

        items.push({
            platform,
            reviewerName,
            rating,
            reviewText,
            reviewDate: reviewDate || new Date(),
            reviewUrl: reviewUrl || null,
        });
    }

    return { items, errors };
}

export function getDefaultReviewRequestConfig(): ReviewRequestConfig {
    return {
        googleUrl: normalizeOptionalUrl(process.env.REVIEW_GOOGLE_URL || ""),
        yelpUrl: normalizeOptionalUrl(process.env.REVIEW_YELP_URL || ""),
        healthgradesUrl: normalizeOptionalUrl(process.env.REVIEW_HEALTHGRADES_URL || ""),
        zocdocUrl: normalizeOptionalUrl(process.env.REVIEW_ZOCDOC_URL || ""),
        facebookUrl: normalizeOptionalUrl(process.env.REVIEW_FACEBOOK_URL || ""),
        otherLabel: compactWhitespace(process.env.REVIEW_OTHER_LABEL || "Other"),
        otherUrl: normalizeOptionalUrl(process.env.REVIEW_OTHER_URL || ""),
    };
}

function parseReviewRequestConfig(value: unknown): ReviewRequestConfig {
    const defaults = getDefaultReviewRequestConfig();
    if (!value || typeof value !== "object") return defaults;

    const obj = value as Record<string, unknown>;
    return {
        googleUrl: normalizeOptionalUrl((obj.googleUrl as string) || defaults.googleUrl),
        yelpUrl: normalizeOptionalUrl((obj.yelpUrl as string) || defaults.yelpUrl),
        healthgradesUrl: normalizeOptionalUrl((obj.healthgradesUrl as string) || defaults.healthgradesUrl),
        zocdocUrl: normalizeOptionalUrl((obj.zocdocUrl as string) || defaults.zocdocUrl),
        facebookUrl: normalizeOptionalUrl((obj.facebookUrl as string) || defaults.facebookUrl),
        otherLabel: compactWhitespace(String(obj.otherLabel || defaults.otherLabel || "Other")) || "Other",
        otherUrl: normalizeOptionalUrl((obj.otherUrl as string) || defaults.otherUrl),
    };
}

export async function getReviewRequestConfig() {
    try {
        const row = await prisma.contentStrategy.findUnique({ where: { key: REVIEW_REQUEST_CONFIG_KEY } });
        return parseReviewRequestConfig(row?.value);
    } catch (error) {
        console.error("[reviews] Failed to load review request config", error);
        return getDefaultReviewRequestConfig();
    }
}

export async function upsertReviewRequestConfig(patch: Partial<ReviewRequestConfig>) {
    const current = await getReviewRequestConfig();

    const next: ReviewRequestConfig = {
        googleUrl: normalizeOptionalUrl(patch.googleUrl ?? current.googleUrl),
        yelpUrl: normalizeOptionalUrl(patch.yelpUrl ?? current.yelpUrl),
        healthgradesUrl: normalizeOptionalUrl(patch.healthgradesUrl ?? current.healthgradesUrl),
        zocdocUrl: normalizeOptionalUrl(patch.zocdocUrl ?? current.zocdocUrl),
        facebookUrl: normalizeOptionalUrl(patch.facebookUrl ?? current.facebookUrl),
        otherLabel: compactWhitespace((patch.otherLabel ?? current.otherLabel) || "Other") || "Other",
        otherUrl: normalizeOptionalUrl(patch.otherUrl ?? current.otherUrl),
    };

    await prisma.contentStrategy.upsert({
        where: { key: REVIEW_REQUEST_CONFIG_KEY },
        create: { key: REVIEW_REQUEST_CONFIG_KEY, value: next as any },
        update: { value: next as any },
    });

    return next;
}

function generateToken() {
    const alphabet = "abcdefghijkmnopqrstuvwxyz23456789";
    const bytes = crypto.randomBytes(10);
    let out = "";
    for (let i = 0; i < bytes.length; i += 1) {
        out += alphabet[bytes[i] % alphabet.length];
    }
    return out;
}

export async function createReviewRequestLink(name?: string | null) {
    let token = generateToken();
    for (let i = 0; i < 6; i += 1) {
        const exists = await prisma.reviewRequestLink.findUnique({ where: { token }, select: { id: true } });
        if (!exists) break;
        token = generateToken();
    }

    return prisma.reviewRequestLink.create({
        data: {
            token,
            name: compactWhitespace(String(name || "")) || null,
            isActive: true,
        },
    });
}

export async function ensureDefaultReviewRequestLink() {
    const existing = await prisma.reviewRequestLink.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
    });
    if (existing) return existing;
    return createReviewRequestLink("Default link");
}

export async function listReviewRequestLinks() {
    return prisma.reviewRequestLink.findMany({
        orderBy: [{ createdAt: "desc" }],
        include: {
            _count: {
                select: { clicks: true },
            },
        },
    });
}

export async function updateReviewRequestLink(options: {
    id: string;
    isActive?: boolean;
    name?: string | null;
}) {
    const data: Record<string, unknown> = {};
    if (options.isActive !== undefined) data.isActive = Boolean(options.isActive);
    if (options.name !== undefined) {
        data.name = compactWhitespace(String(options.name || "")) || null;
    }

    if (!Object.keys(data).length) {
        return prisma.reviewRequestLink.findUnique({ where: { id: options.id } });
    }

    return prisma.reviewRequestLink.update({
        where: { id: options.id },
        data,
    });
}

export async function recordReviewRequestClick(options: {
    token: string;
    platform: ReviewPlatform;
    referrer?: string | null;
    userAgent?: string | null;
}) {
    const link = await prisma.reviewRequestLink.findUnique({ where: { token: options.token } });
    if (!link || !link.isActive) {
        throw new Error("Review request link not found");
    }

    return prisma.reviewRequestClick.create({
        data: {
            linkId: link.id,
            platform: options.platform,
            referrer: compactWhitespace(String(options.referrer || "")) || null,
            userAgent: compactWhitespace(String(options.userAgent || "")).slice(0, 500) || null,
        },
    });
}

export async function getPendingReviewCount() {
    return prisma.publicReview.count({
        where: {
            responseStatus: {
                in: [ReviewResponseStatus.PENDING, ReviewResponseStatus.DRAFTED],
            },
        },
    });
}

export async function getReviewAnalytics() {
    const [byPlatform, allReviews, respondedReviews] = await Promise.all([
        prisma.publicReview.groupBy({
            by: ["platform"],
            _avg: { rating: true },
            _count: { _all: true },
            orderBy: { platform: "asc" },
        }),
        prisma.publicReview.findMany({
            select: { reviewDate: true, rating: true, platform: true, responseStatus: true },
            orderBy: { reviewDate: "asc" },
        }),
        prisma.publicReview.findMany({
            where: { respondedDate: { not: null } },
            select: {
                reviewDate: true,
                respondedDate: true,
            },
        }),
    ]);

    const now = new Date();
    const monthBuckets: Array<{ key: string; label: string; count: number }> = [];
    for (let i = 11; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        monthBuckets.push({ key, label, count: 0 });
    }
    const bucketByKey = new Map(monthBuckets.map((b) => [b.key, b]));

    for (const row of allReviews) {
        const d = new Date(row.reviewDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const bucket = bucketByKey.get(key);
        if (bucket) bucket.count += 1;
    }

    let totalResponseHours = 0;
    let responseSamples = 0;
    let within24hCount = 0;

    for (const row of respondedReviews) {
        if (!row.respondedDate) continue;
        const deltaMs = new Date(row.respondedDate).getTime() - new Date(row.reviewDate).getTime();
        if (!Number.isFinite(deltaMs)) continue;
        const hours = Math.max(0, deltaMs / (1000 * 60 * 60));
        totalResponseHours += hours;
        responseSamples += 1;
        if (hours <= 24) within24hCount += 1;
    }

    const pendingCount = allReviews.filter((x) => x.responseStatus === ReviewResponseStatus.PENDING || x.responseStatus === ReviewResponseStatus.DRAFTED).length;

    return {
        byPlatform: byPlatform.map((row) => ({
            platform: row.platform,
            platformLabel: REVIEW_PLATFORM_LABELS[row.platform],
            averageRating: Number((row._avg.rating || 0).toFixed(2)),
            reviewCount: row._count._all,
        })),
        volumeByMonth: monthBuckets,
        totalReviews: allReviews.length,
        pendingCount,
        averageResponseTimeHours: responseSamples ? Number((totalResponseHours / responseSamples).toFixed(2)) : null,
        responseSamples,
        within24hRate: responseSamples ? Number((within24hCount / responseSamples).toFixed(4)) : null,
    };
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

function splitIntoSentences(text: string) {
    return String(text || "")
        .split(/(?<=[.!?])\s+/)
        .map((s) => compactWhitespace(s))
        .filter(Boolean);
}

function trimToSentenceRange(text: string, minSentences: number, maxSentences: number) {
    const sentences = splitIntoSentences(text);
    if (!sentences.length) return "";

    const kept = sentences.slice(0, maxSentences);
    if (kept.length < minSentences) {
        return sentences.slice(0, Math.min(sentences.length, minSentences)).join(" ");
    }
    return kept.join(" ");
}

function extractReviewAspect(reviewText: string) {
    const lower = String(reviewText || "").toLowerCase();
    if (lower.includes("same day") || lower.includes("next day")) return "timely access";
    if (lower.includes("communication") || lower.includes("responsive")) return "communication";
    if (lower.includes("telehealth") || lower.includes("virtual")) return "telehealth access";
    if (lower.includes("pricing") || lower.includes("cost") || lower.includes("afford")) return "transparent pricing";
    if (lower.includes("kind") || lower.includes("compassion")) return "the care and professionalism of our team";
    if (lower.includes("doctor") || lower.includes("physician")) return "continuity with the same physician";
    return "your feedback";
}

function resolveResponseContactLine() {
    const direct = compactWhitespace(String(process.env.REVIEW_RESPONSE_CONTACT || ""));
    if (direct) return direct;

    const phone = compactWhitespace(String(process.env.PRACTICE_PHONE || ""));
    const email = compactWhitespace(String(process.env.ADMIN_NOTIFY_EMAIL || ""));

    if (phone && email) {
        return `Please contact us directly at ${phone} or ${email} so we can follow up.`;
    }
    if (phone) {
        return `Please contact us directly at ${phone} so we can follow up.`;
    }
    if (email) {
        return `Please contact us directly at ${email} so we can follow up.`;
    }
    return "Please contact our team directly so we can follow up and learn more.";
}

function buildFallbackResponse(review: {
    rating: number;
    reviewText: string;
}) {
    const contactLine = resolveResponseContactLine();
    const aspect = extractReviewAspect(review.reviewText || "");

    if (review.rating >= 4) {
        return trimToSentenceRange(
            `Thank you for sharing this kind feedback. We are glad to hear ${aspect} stood out to you. We appreciate you taking the time to leave a review and support our team.`,
            2,
            4
        );
    }

    if (review.rating === 3) {
        return trimToSentenceRange(
            `Thank you for taking the time to share your feedback. We appreciate hearing where your experience could have been better, and we are always working to improve. ${contactLine}`,
            3,
            5
        );
    }

    return trimToSentenceRange(
        `Thank you for sharing this feedback. We are sorry to hear your experience did not meet expectations. We take concerns seriously and want to understand what happened. ${contactLine}`,
        3,
        5
    );
}

function sanitizeDraftResponse(value: string, rating: number) {
    let text = compactWhitespace(String(value || ""));
    if (!text) return "";

    const unsafePatterns = [
        /as your (doctor|physician)/i,
        /as your patient/i,
        /your diagnosis/i,
        /your treatment/i,
        /your medication/i,
        /we treated/i,
        /medical record/i,
    ];

    if (unsafePatterns.some((pattern) => pattern.test(text))) {
        return "";
    }

    const bounded = rating >= 4 ? trimToSentenceRange(text, 2, 4) : trimToSentenceRange(text, 3, 5);
    return bounded;
}

function buildDraftPrompt(review: {
    platform: ReviewPlatform;
    rating: number;
    reviewerName: string;
    reviewText: string;
}) {
    const platformLabel = REVIEW_PLATFORM_LABELS[review.platform] || "review platform";
    const contactLine = resolveResponseContactLine();

    const lengthRule = review.rating >= 4 ? "2-4 sentences" : review.rating === 3 ? "3-5 sentences" : "3-5 sentences";
    const intentRule =
        review.rating >= 4
            ? "Thank them warmly, mention what they praised naturally, and keep it personal and genuine."
            : review.rating === 3
                ? "Thank them, acknowledge feedback, offer to improve their experience, and include follow-up contact info."
                : "Respond with empathy, no defensiveness, offer to discuss offline, and include direct contact info.";

    return [
        "You draft public business review responses for Present Health.",
        "Strict safety rules:",
        "- Never reference specific medical conditions, diagnoses, symptoms, treatments, or medications.",
        "- Never confirm the reviewer is or was a patient.",
        "- Never include PHI.",
        "- Keep tone warm, professional, and concise.",
        "",
        `Platform: ${platformLabel}`,
        `Rating: ${review.rating}/5`,
        `Reviewer display name: ${review.reviewerName}`,
        `Review text: ${review.reviewText}`,
        "",
        `Response requirements: ${intentRule}`,
        `Length: ${lengthRule}`,
        "Include city/state naturally only if it is explicitly mentioned in the review text.",
        "If rating is 1-3 stars, include this follow-up line or equivalent:",
        contactLine,
        "",
        "Return JSON only:",
        JSON.stringify({ response: "" }, null, 2),
    ].join("\n");
}

async function callClaude(prompt: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!apiKey) return null;

    const model = process.env.REVIEW_RESPONSE_ANTHROPIC_MODEL || DEFAULT_CLAUDE_MODEL;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model,
            max_tokens: 900,
            temperature: 0.2,
            messages: [{ role: "user", content: prompt }],
        }),
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Claude review response request failed (${res.status}): ${detail || "unknown error"}`);
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

    const model = process.env.REVIEW_RESPONSE_OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
        model,
        temperature: 0.2,
        max_tokens: 700,
        messages: [
            {
                role: "system",
                content:
                    "You draft HIPAA-safe business review responses for a healthcare practice. Return JSON only.",
            },
            { role: "user", content: prompt },
        ],
    });

    const text = response.choices[0]?.message?.content?.trim() || "";
    return { model, text };
}

async function generateReviewResponseWithLlm(review: {
    platform: ReviewPlatform;
    rating: number;
    reviewerName: string;
    reviewText: string;
}) {
    const prompt = buildDraftPrompt(review);

    try {
        const claude = await callClaude(prompt);
        if (claude?.text) {
            const parsed = parseJsonObject(claude.text);
            const response = sanitizeDraftResponse(String(parsed?.response || ""), review.rating);
            if (response) {
                return {
                    provider: "claude" as const,
                    model: claude.model,
                    response,
                };
            }
        }
    } catch (error) {
        console.error("[reviews] Claude draft response failed", error);
    }

    try {
        const openai = await callOpenAi(prompt);
        if (openai?.text) {
            const parsed = parseJsonObject(openai.text);
            const response = sanitizeDraftResponse(String(parsed?.response || ""), review.rating);
            if (response) {
                return {
                    provider: "openai" as const,
                    model: openai.model,
                    response,
                };
            }
        }
    } catch (error) {
        console.error("[reviews] OpenAI draft response failed", error);
    }

    return {
        provider: "fallback" as const,
        model: "template-v1",
        response: buildFallbackResponse(review),
    };
}

export async function draftReviewResponse(options: { reviewId: string; actorUserId?: string | null }) {
    const review = await prisma.publicReview.findUnique({
        where: { id: options.reviewId },
        select: {
            id: true,
            platform: true,
            rating: true,
            reviewerName: true,
            reviewText: true,
        },
    });

    if (!review) throw new Error("Review not found");

    const generated = await generateReviewResponseWithLlm(review);

    const updated = await prisma.publicReview.update({
        where: { id: review.id },
        data: {
            responseText: generated.response,
            responseStatus: ReviewResponseStatus.DRAFTED,
            draftGeneratedAt: new Date(),
        },
    });

    await prisma.auditLog.create({
        data: {
            actorUserId: options.actorUserId || null,
            action: "REVIEW_RESPONSE_DRAFTED",
            entityType: "PublicReview",
            entityId: review.id,
            metadata: {
                reviewId: review.id,
                provider: generated.provider,
                model: generated.model,
            },
        },
    });

    return updated;
}

export function validateReviewCreatePayload(payload: Record<string, unknown>) {
    const platform = parseReviewPlatform(payload.platform);
    const reviewerName = compactWhitespace(String(payload.reviewerName || ""));
    const rating = clampRating(payload.rating);
    const reviewText = compactWhitespace(String(payload.reviewText || ""));
    const reviewDate = parseDateLoose(String(payload.reviewDate || "")) || new Date();
    const reviewUrl = normalizeOptionalUrl(String(payload.reviewUrl || ""));

    if (!reviewerName) throw new Error("reviewer_name is required");
    if (!rating) throw new Error("rating must be an integer from 1 to 5");
    if (!reviewText) throw new Error("review_text is required");

    return {
        platform,
        reviewerName,
        rating,
        reviewText,
        reviewDate,
        reviewUrl: reviewUrl || null,
    };
}

export function parseResponseStatus(value: unknown): ReviewResponseStatus | null {
    const raw = compactWhitespace(String(value || "")).toUpperCase();
    if (raw === "PENDING") return ReviewResponseStatus.PENDING;
    if (raw === "DRAFTED") return ReviewResponseStatus.DRAFTED;
    if (raw === "RESPONDED") return ReviewResponseStatus.RESPONDED;
    if (raw === "SKIPPED") return ReviewResponseStatus.SKIPPED;
    return null;
}

export function platformFromParam(value: string | null | undefined): ReviewPlatform | null {
    if (!value) return null;
    const parsed = parseReviewPlatform(value);
    return parsed;
}

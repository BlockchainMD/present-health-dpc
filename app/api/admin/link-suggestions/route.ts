import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const CORE_PAGES = [
    { label: "Pricing", url: "/pricing", type: "page" },
    { label: "How it works", url: "/how-it-works", type: "page" },
    { label: "Join", url: "/join", type: "page" },
    { label: "States", url: "/states", type: "page" },
    { label: "Our physicians", url: "/our-physicians", type: "page" },
    { label: "For employers", url: "/for-employers", type: "page" },
    { label: "About (Trust Hub)", url: "/about", type: "page" },
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
]);

function extractKeywords(text: string) {
    const cleaned = String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const tokens = cleaned.split(" ").map((t) => t.trim()).filter(Boolean);
    const out: string[] = [];
    for (const t of tokens) {
        if (t.length < 4) continue;
        if (STOPWORDS.has(t)) continue;
        if (out.includes(t)) continue;
        out.push(t);
        if (out.length >= 8) break;
    }
    return out;
}

export async function POST(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => null);
        const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        const text = typeof payload?.text === "string" ? payload.text : "";
        const keywords = extractKeywords(text);

        const now = new Date();
        const articleWhere =
            keywords.length > 0
                ? {
                    status: "PUBLISHED" as const,
                    slug: { not: null as any },
                    OR: [{ publishedAt: null as any }, { publishedAt: { lte: now } }],
                    AND: [
                        {
                            OR: keywords.flatMap((k) => [
                                { title: { contains: k, mode: "insensitive" as const } },
                                { excerpt: { contains: k, mode: "insensitive" as const } },
                            ]),
                        },
                    ],
                }
                : {
                    status: "PUBLISHED" as const,
                    slug: { not: null as any },
                    OR: [{ publishedAt: null as any }, { publishedAt: { lte: now } }],
                };

        const articles = await prisma.article.findMany({
            where: articleWhere as any,
            orderBy: [
                { publishedAt: { sort: "desc", nulls: "last" } as any },
                { createdAt: "desc" },
            ],
            take: keywords.length ? 10 : 6,
            select: { slug: true, title: true, category: true },
        });

        const suggestions = [
            ...CORE_PAGES,
            ...articles
                .filter((a) => a.slug)
                .map((a) => ({
                    label: a.title,
                    url: `/learn/${a.slug}`,
                    type: a.category ? `article:${a.category}` : "article",
                })),
        ];

        // Deduplicate by url
        const unique = new Map<string, (typeof suggestions)[number]>();
        for (const s of suggestions) unique.set(s.url, s);

        return NextResponse.json({ success: true, suggestions: Array.from(unique.values()).slice(0, 16) });
    } catch (error) {
        console.error("[AdminLinkSuggestionsAPI] Error:", error);
        return NextResponse.json({ success: false, error: "Failed to load suggestions" }, { status: 500 });
    }
}


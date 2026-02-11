import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/site-url";

export type SitemapChangefreq =
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";

export type SitemapEntry = {
    path: string;
    loc: string;
    lastmod: Date;
    changefreq: SitemapChangefreq;
    priority: number;
    type: "static" | "state" | "article" | "physician";
};

export const STATIC_PUBLIC_PATHS = [
    "/",
    "/how-it-works",
    "/pricing",
    "/our-physicians",
    "/states",
    "/learn",
    "/for-employers",
    "/about",
    "/privacy",
    "/terms",
] as const;

function includeJoinInSitemap() {
    const raw = String(process.env.SITEMAP_INCLUDE_JOIN || "").trim().toLowerCase();
    return raw === "1" || raw === "true" || raw === "yes";
}

function articleChangefreq(updatedAt: Date) {
    const ageDays = Math.max(0, (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (ageDays <= 7) return "daily" as const;
    if (ageDays <= 30) return "weekly" as const;
    if (ageDays <= 180) return "monthly" as const;
    return "yearly" as const;
}

function normalizePriority(value: number) {
    if (!Number.isFinite(value)) return 0.5;
    return Math.max(0, Math.min(1, Number(value.toFixed(1))));
}

function dedupeEntries(entries: SitemapEntry[]) {
    const byPath = new Map<string, SitemapEntry>();
    for (const entry of entries) {
        const existing = byPath.get(entry.path);
        if (!existing) {
            byPath.set(entry.path, entry);
            continue;
        }
        if (entry.lastmod.getTime() > existing.lastmod.getTime()) {
            byPath.set(entry.path, entry);
        }
    }
    return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export async function buildSitemapEntries() {
    const now = new Date();
    const [articles, states, physicians, latestArticle, latestState, latestPhysician] = await Promise.all([
        prisma.article.findMany({
            where: {
                status: "PUBLISHED",
                slug: { not: null },
                OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
            },
            select: {
                slug: true,
                updatedAt: true,
                publishedAt: true,
                createdAt: true,
            },
            orderBy: { updatedAt: "desc" },
            take: 5000,
        }),
        prisma.state.findMany({
            where: { isActive: true },
            select: { slug: true, updatedAt: true },
            orderBy: { updatedAt: "desc" },
            take: 5000,
        }),
        prisma.physician.findMany({
            where: { isActive: true },
            select: { slug: true, updatedAt: true },
            orderBy: { updatedAt: "desc" },
            take: 5000,
        }),
        prisma.article.findFirst({
            where: { status: "PUBLISHED", slug: { not: null } },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true },
        }),
        prisma.state.findFirst({
            where: { isActive: true },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true },
        }),
        prisma.physician.findFirst({
            where: { isActive: true },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true },
        }),
    ]);

    const siteLastmodCandidates = [
        latestArticle?.updatedAt?.getTime() || 0,
        latestState?.updatedAt?.getTime() || 0,
        latestPhysician?.updatedAt?.getTime() || 0,
    ].filter((value) => value > 0);
    const siteLastmod = new Date(
        siteLastmodCandidates.length ? Math.max(...siteLastmodCandidates) : now.getTime()
    );

    const staticEntries: SitemapEntry[] = [
        {
            path: "/",
            loc: absoluteUrl("/"),
            lastmod: siteLastmod,
            changefreq: "monthly",
            priority: 1.0,
            type: "static",
        },
        {
            path: "/how-it-works",
            loc: absoluteUrl("/how-it-works"),
            lastmod: siteLastmod,
            changefreq: "monthly",
            priority: 1.0,
            type: "static",
        },
        {
            path: "/pricing",
            loc: absoluteUrl("/pricing"),
            lastmod: siteLastmod,
            changefreq: "monthly",
            priority: 1.0,
            type: "static",
        },
        {
            path: "/our-physicians",
            loc: absoluteUrl("/our-physicians"),
            lastmod: latestPhysician?.updatedAt || siteLastmod,
            changefreq: "monthly",
            priority: 0.8,
            type: "static",
        },
        {
            path: "/states",
            loc: absoluteUrl("/states"),
            lastmod: latestState?.updatedAt || siteLastmod,
            changefreq: "monthly",
            priority: 0.8,
            type: "static",
        },
        {
            path: "/learn",
            loc: absoluteUrl("/learn"),
            lastmod: latestArticle?.updatedAt || siteLastmod,
            changefreq: "weekly",
            priority: 0.8,
            type: "static",
        },
        {
            path: "/for-employers",
            loc: absoluteUrl("/for-employers"),
            lastmod: siteLastmod,
            changefreq: "monthly",
            priority: 0.9,
            type: "static",
        },
        {
            path: "/about",
            loc: absoluteUrl("/about"),
            lastmod: siteLastmod,
            changefreq: "monthly",
            priority: 0.8,
            type: "static",
        },
        {
            path: "/privacy",
            loc: absoluteUrl("/privacy"),
            lastmod: siteLastmod,
            changefreq: "yearly",
            priority: 0.3,
            type: "static",
        },
        {
            path: "/terms",
            loc: absoluteUrl("/terms"),
            lastmod: siteLastmod,
            changefreq: "yearly",
            priority: 0.3,
            type: "static",
        },
    ];

    if (includeJoinInSitemap()) {
        staticEntries.push({
            path: "/join",
            loc: absoluteUrl("/join"),
            lastmod: siteLastmod,
            changefreq: "monthly",
            priority: 0.7,
            type: "static",
        });
    }

    const stateEntries: SitemapEntry[] = states.map((state) => ({
        path: `/states/${state.slug}`,
        loc: absoluteUrl(`/states/${state.slug}`),
        lastmod: state.updatedAt || siteLastmod,
        changefreq: "monthly",
        priority: 0.9,
        type: "state",
    }));

    const physicianEntries: SitemapEntry[] = physicians.map((physician) => ({
        path: `/our-physicians/${physician.slug}`,
        loc: absoluteUrl(`/our-physicians/${physician.slug}`),
        lastmod: physician.updatedAt || siteLastmod,
        changefreq: "monthly",
        priority: 0.7,
        type: "physician",
    }));

    const articleEntries: SitemapEntry[] = articles
        .filter((article): article is typeof article & { slug: string } => Boolean(article.slug))
        .map((article) => {
            const lastmod = article.updatedAt || article.publishedAt || article.createdAt || siteLastmod;
            return {
                path: `/learn/${article.slug}`,
                loc: absoluteUrl(`/learn/${article.slug}`),
                lastmod,
                changefreq: articleChangefreq(lastmod),
                priority: 0.8,
                type: "article",
            } satisfies SitemapEntry;
        });

    return dedupeEntries([...staticEntries, ...stateEntries, ...physicianEntries, ...articleEntries]).map((entry) => ({
        ...entry,
        priority: normalizePriority(entry.priority),
    }));
}

export async function buildExpectedIndexablePaths() {
    const entries = await buildSitemapEntries();
    return entries.map((entry) => entry.path);
}

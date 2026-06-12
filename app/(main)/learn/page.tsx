import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Markdown } from "@/components/markdown";
import { normalizeMarkdownForRender } from "@/lib/markdown-utils";
import { SchemaBlocks } from "@/components/seo/SchemaBlocks";
import { LEARN_CATEGORIES, categoryLabel, estimateReadTimeMinutes, isLearnCategorySlug } from "@/lib/learn";
import { absoluteUrl } from "@/lib/site-url";
import { buildLearnHubSchemas } from "@/lib/schema";

export const metadata: Metadata = {
    title: "Learn | Present Health",
    description: "Educational articles on primary care, telehealth, and preventive health from Present Health.",
    alternates: {
        canonical: absoluteUrl("/learn"),
    },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Promise<{ q?: string; category?: string; page?: string }>;

function selectClassName() {
    return "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
}

function buildLearnHref({
    q,
    category,
    page,
}: {
    q?: string;
    category?: string;
    page?: number;
}) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (category) sp.set("category", category);
    if (page && page > 1) sp.set("page", String(page));
    const qs = sp.toString();
    return qs ? `/learn?${qs}` : "/learn";
}

export default async function LearnHubPage({ searchParams }: { searchParams: SearchParams }) {
    const sp = await searchParams;
    const q = typeof sp?.q === "string" ? sp.q.trim().slice(0, 200) : "";
    const category = typeof sp?.category === "string" && isLearnCategorySlug(sp.category) ? sp.category : "";
    const pageRaw = typeof sp?.page === "string" ? Number.parseInt(sp.page, 10) : 1;
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const pageSize = 12;
    const skip = (page - 1) * pageSize;
    const now = new Date();

    const where: any = {
        status: "PUBLISHED",
        OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
    };
    if (category) where.category = category;
    if (q) {
        where.AND = [
            {
                OR: [
                    { title: { contains: q, mode: "insensitive" } },
                    { excerpt: { contains: q, mode: "insensitive" } },
                    { content: { contains: q, mode: "insensitive" } },
                ],
            },
        ];
    }

    const [articles, total] = await prisma.$transaction([
        prisma.article.findMany({
            where,
            orderBy: [
                // If/when `publishedAt` is set consistently, this becomes a true "publish date" sort.
                // Prisma supports null ordering on Postgres.
                { publishedAt: { sort: "desc", nulls: "last" } as any },
                { createdAt: "desc" },
            ],
            skip,
            take: pageSize,
            select: {
                id: true,
                slug: true,
                title: true,
                excerpt: true,
                content: true,
                category: true,
                publishedAt: true,
                createdAt: true,
            },
        }),
        prisma.article.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const schemaBlocks = buildLearnHubSchemas();

    return (
        <div className="container px-4 md:px-6 mx-auto py-24">
            <SchemaBlocks blocks={schemaBlocks} idPrefix="learn-hub" />

            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold tracking-tight mb-4">Learn</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Practical, evidence-aligned explanations to help you make better health decisions.
                </p>
            </div>

            <section className="max-w-6xl mx-auto">
                <form method="get" className="grid gap-4 sm:grid-cols-[220px_1fr_auto] items-end">
                    <div className="grid gap-2">
                        <Label htmlFor="category">Category</Label>
                        <select id="category" name="category" defaultValue={category} className={selectClassName()}>
                            <option value="">All categories</option>
                            {LEARN_CATEGORIES.map((c) => (
                                <option key={c.slug} value={c.slug}>
                                    {c.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="q">Search</Label>
                        <Input
                            id="q"
                            name="q"
                            defaultValue={q}
                            placeholder="Search articles..."
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit">Apply</Button>
                        <Button type="button" variant="outline" asChild>
                            <Link href="/learn">Clear</Link>
                        </Button>
                    </div>
                </form>

                <div className="mt-8 flex items-center justify-between gap-4 flex-wrap">
                    <div className="text-sm text-muted-foreground">
                        {total === 1 ? "1 article" : `${total} articles`}
                        {category ? (
                            <>
                                {" "}
                                in <span className="font-medium text-foreground">{categoryLabel(category) || category}</span>
                            </>
                        ) : null}
                        {q ? (
                            <>
                                {" "}
                                matching <span className="font-medium text-foreground">“{q}”</span>
                            </>
                        ) : null}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Page <span className="font-medium text-foreground">{Math.min(page, totalPages)}</span> of{" "}
                        <span className="font-medium text-foreground">{totalPages}</span>
                    </div>
                </div>

                <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {articles.map((article) => {
                    const href = `/learn/${article.slug || article.id}`;
                    const date = article.publishedAt || article.createdAt;
                    const readTime = estimateReadTimeMinutes(article.content || "");
                    const label = categoryLabel(article.category) || null;
                    return (
                        <Card key={article.id} className="flex flex-col h-full hover:shadow-lg transition-shadow border-border/60">
                            <CardHeader>
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="text-xs text-muted-foreground">
                                        {format(new Date(date), "MMM d, yyyy")}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {label ? <Badge variant="secondary">{label}</Badge> : null}
                                        <Badge variant="outline">{readTime} min read</Badge>
                                    </div>
                                </div>
                                <CardTitle className="leading-tight hover:text-primary transition-colors">
                                    <Link href={href}>{article.title}</Link>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="text-muted-foreground line-clamp-4 text-sm prose prose-sm dark:prose-invert">
                                    <Markdown
                                        content={normalizeMarkdownForRender(
                                            article.excerpt || article.content.substring(0, 200) + "..."
                                        )}
                                    />
                                </div>
                                <Link
                                    href={href}
                                    className="inline-flex items-center text-primary text-sm font-medium mt-4 hover:underline"
                                >
                                    Read more
                                </Link>
                            </CardContent>
                        </Card>
                    );
                })}
                </div>

                {articles.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        No articles found.
                    </div>
                ) : null}

                <div className="mt-10 flex items-center justify-between gap-4">
                    <Button
                        variant="outline"
                        asChild
                        disabled={page <= 1}
                    >
                        <Link href={buildLearnHref({ q, category, page: Math.max(1, page - 1) })} aria-disabled={page <= 1}>
                            Previous
                        </Link>
                    </Button>
                    <Button
                        variant="outline"
                        asChild
                        disabled={page >= totalPages}
                    >
                        <Link href={buildLearnHref({ q, category, page: Math.min(totalPages, page + 1) })} aria-disabled={page >= totalPages}>
                            Next
                        </Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}

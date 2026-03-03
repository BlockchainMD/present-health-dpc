import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SchemaBlocks } from "@/components/seo/SchemaBlocks";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArticleMarkdown } from "@/components/learn/ArticleMarkdown";
import { normalizeMarkdownForRender } from "@/lib/markdown-utils";
import { stripTemplateOwnedSections } from "@/lib/content-engine/sections";
import { absoluteUrl } from "@/lib/site-url";
import { categoryLabel, estimateReadTimeMinutes } from "@/lib/learn";
import { extractToc } from "@/lib/markdown-toc";
import { markdownToPlainText } from "@/lib/markdown-plain";
import { buildLearnArticleSchemas, coerceFaqs } from "@/lib/schema";
import { CLINICAL_TEAM_URL, EDITORIAL_POLICY_URL, formatLastUpdated } from "@/lib/content-engine/policy";
import { AssessmentWidget } from "@/components/assessment/AssessmentWidget";

// ISR: cache article pages for 1 hour; on-demand revalidation via revalidatePath
// in the admin PATCH route and the content-cron route keeps fresh content visible
// quickly without DB hits on every request.
export const revalidate = 3600;
export const runtime = "nodejs";

function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function stripLeadingH1(markdown: string) {
    const trimmed = markdown.trimStart();
    if (!trimmed.startsWith("# ")) {
        return markdown;
    }
    return trimmed.replace(/^#\s+[^\n]*\n+/, "");
}

async function findArticle(topicSlug: string | undefined) {
    if (!topicSlug) return null;
    try {
        if (isUuid(topicSlug)) {
            return await prisma.article.findUnique({
                where: { id: topicSlug },
                include: { authorPhysician: true },
            });
        }
        const bySlug = await prisma.article.findUnique({
            where: { slug: topicSlug },
            include: { authorPhysician: true },
        });
        if (bySlug) return bySlug;
    } catch (error) {
        console.error("[learn] Article lookup failed", { topicSlug, error });
    }
    try {
        return await prisma.article.findFirst({
            where: {
                status: "PUBLISHED",
                slug: topicSlug,
            },
            include: { authorPhysician: true },
        });
    } catch (error) {
        console.error("[learn] Article fallback lookup failed", { topicSlug, error });
        return null;
    }
}

type TopicParams = { topicSlug: string } | Promise<{ topicSlug: string }>;

export async function generateMetadata({ params }: { params: TopicParams }): Promise<Metadata> {
    const { topicSlug } = await params;
    const article = await findArticle(topicSlug);

    const now = new Date();
    const isLive = Boolean(article && article.status === "PUBLISHED" && (!article.publishedAt || article.publishedAt <= now));
    if (!isLive || !article) {
        return {};
    }

    const url = absoluteUrl(`/learn/${article.slug || article.id}`);
    const title = article.metaTitle || article.title;
    const description = article.metaDescription || article.excerpt || markdownToPlainText(article.content).slice(0, 160) || undefined;
    const images = article.featuredImage ? [absoluteUrl(article.featuredImage)] : undefined;

    return {
        title,
        description,
        alternates: {
            canonical: absoluteUrl(`/learn/${article.slug || article.id}`),
        },
        openGraph: {
            type: "article",
            url,
            title,
            description,
            images,
            publishedTime: (article.publishedAt || article.createdAt).toISOString(),
            modifiedTime: article.updatedAt.toISOString(),
        },
        twitter: {
            card: article.featuredImage ? "summary_large_image" : "summary",
            title,
            description,
            images,
        },
    };
}

export default async function LearnArticlePage({ params }: { params: TopicParams }) {
    const { topicSlug } = await params;

    const article = await findArticle(topicSlug);

    const now = new Date();
    if (!article || article.status !== "PUBLISHED" || (article.publishedAt && article.publishedAt > now)) {
        notFound();
    }

    const rawContent = stripTemplateOwnedSections(stripLeadingH1(article.content || ""));
    const content = normalizeMarkdownForRender(rawContent);
    const toc = extractToc(content);
    const faqs = coerceFaqs(article.faqs);

    const publishedDate = article.publishedAt || article.createdAt;
    const updatedDate = article.updatedAt;
    const readTime = estimateReadTimeMinutes(content);
    const category = categoryLabel(article.category) || null;

    const authorPhysician = article.authorPhysician;
    const authorName = authorPhysician?.name || "Present Health Team";
    const authorCanLink = Boolean(authorPhysician?.slug && authorPhysician.isActive);
    const visibleSummary = article.excerpt?.trim() || "";
    const schemaBlocks = buildLearnArticleSchemas(article as any);

    const reviewerName = article.reviewedByDisplayName || "Present Health Clinical Team";
    const reviewerDate = article.reviewedAt || article.updatedAt;
    const isClinical = article.reviewType !== "EDITORIAL";

    const related = article.category
        ? await prisma.article.findMany({
            where: {
                status: "PUBLISHED",
                category: article.category,
                id: { not: article.id },
                OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
            },
            orderBy: [
                { publishedAt: { sort: "desc", nulls: "last" } as any },
                { createdAt: "desc" },
            ],
            take: 4,
            select: {
                id: true,
                slug: true,
                title: true,
                excerpt: true,
                content: true,
                publishedAt: true,
                createdAt: true,
                category: true,
            },
        })
        : [];

    return (
        <div className="container px-4 md:px-6 mx-auto py-24 max-w-6xl">
            <SchemaBlocks blocks={schemaBlocks} idPrefix={`learn-${article.slug || article.id}`} />

            <div className="mb-8">
                <Button variant="ghost" asChild className="-ml-4 text-muted-foreground">
                    <Link href="/learn">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Learn
                    </Link>
                </Button>
            </div>

            <div className="grid gap-10 lg:grid-cols-[1fr_280px] items-start">
                <article className="min-w-0">
                    <header className="mb-10">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            {category ? <Badge variant="secondary">{category}</Badge> : null}
                            <Badge variant="outline">{readTime} min read</Badge>
                            <Badge variant="outline">Updated {format(new Date(updatedDate), "MMM d, yyyy")}</Badge>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">{article.title}</h1>

                        {visibleSummary ? (
                            <p className="mt-5 text-lg text-muted-foreground max-w-3xl">{visibleSummary}</p>
                        ) : null}

                        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <div>
                                By{" "}
                                {authorCanLink ? (
                                    <Link href={`/our-physicians/${authorPhysician!.slug}`} className="text-foreground hover:text-primary hover:underline">
                                        {authorName}
                                    </Link>
                                ) : (
                                    <span className="text-foreground">{authorName}</span>
                                )}
                            </div>
                            <span aria-hidden="true">•</span>
                            <time dateTime={publishedDate.toISOString()}>
                                Published {format(new Date(publishedDate), "MMM d, yyyy")}
                            </time>
                        </div>

                    </header>

                    {article.featuredImage ? (
                        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-border/60 bg-muted mb-10">
                            {(() => {
                                const src = article.featuredImage as string;
                                const useNextImage = src.startsWith("/") || src.startsWith("https://storage.googleapis.com");
                                return useNextImage ? (
                                    <Image
                                        src={src}
                                        alt={article.title}
                                        fill
                                        className="object-cover"
                                        sizes="(min-width: 1024px) 900px, 100vw"
                                        priority
                                    />
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={src} alt={article.title} className="absolute inset-0 h-full w-full object-cover" />
                                );
                            })()}
                        </div>
                    ) : null}

                    <div className="prose prose-lg dark:prose-invert max-w-none">
                        <ArticleMarkdown content={content} />
                    </div>

                    {faqs.length ? (
                        <section className="mt-12">
                            <h2 className="text-2xl font-bold tracking-tight mb-4">Frequently asked questions</h2>
                            <Card className="border-border/60">
                                <CardContent className="pt-6">
                                    <Accordion type="single" collapsible className="w-full">
                                        {faqs.map((faq, idx) => (
                                            <AccordionItem key={idx} value={`faq-${idx}`}>
                                                <AccordionTrigger>{faq.question}</AccordionTrigger>
                                                <AccordionContent className="prose prose-sm max-w-none dark:prose-invert">
                                                    <ArticleMarkdown content={faq.answer} />
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </CardContent>
                            </Card>
                        </section>
                    ) : null}

                    {related.length ? (
                        <section className="mt-12">
                            <h2 className="text-2xl font-bold tracking-tight mb-4">Related articles</h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                {related.map((r) => {
                                    const href = `/learn/${r.slug || r.id}`;
                                    const d = r.publishedAt || r.createdAt;
                                    const rt = estimateReadTimeMinutes(r.content || "");
                                    return (
                                        <Card key={r.id} className="border-border/60 hover:shadow-md transition-shadow">
                                            <CardHeader>
                                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                                    <div className="text-xs text-muted-foreground">
                                                        {format(new Date(d), "MMM d, yyyy")}
                                                    </div>
                                                    <Badge variant="outline">{rt} min read</Badge>
                                                </div>
                                                <CardTitle className="text-lg leading-tight">
                                                    <Link href={href} className="hover:text-primary hover:underline">
                                                        {r.title}
                                                    </Link>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="text-sm text-muted-foreground">
                                                <div className="line-clamp-3 prose prose-sm dark:prose-invert max-w-none">
                                                    <ArticleMarkdown content={normalizeMarkdownForRender(r.excerpt || r.content.substring(0, 180) + "...")} />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </section>
                    ) : null}

                    {/* E-E-A-T footer: reviewer attribution, editorial policy, last updated */}
                    <section className="mt-12">
                        <div className="rounded-xl border border-border bg-muted/20 p-5 text-sm text-muted-foreground space-y-1.5">
                            <div className="font-medium text-foreground">
                                {isClinical ? "Medically reviewed by" : "Editorial review by"}
                            </div>
                            <div>{reviewerName}</div>
                            <div>
                                <Link href={CLINICAL_TEAM_URL} className="text-primary hover:underline">
                                    Clinical Team &amp; Medical Review Process
                                </Link>
                                {" · "}
                                <Link href={EDITORIAL_POLICY_URL} className="text-primary hover:underline">
                                    Editorial Policy
                                </Link>
                            </div>
                            <div>Last reviewed: {formatLastUpdated(new Date(reviewerDate))}</div>
                        </div>
                    </section>

                    <section className="mt-8">
                        <AssessmentWidget articleSlug={article.slug || article.id} cluster={article.cluster || undefined} compact />
                    </section>

                    <section className="mt-8">
                        <div className="rounded-2xl border border-border bg-muted/20 p-8 text-center">
                            <h2 className="text-2xl font-bold tracking-tight mb-3">Ready to try a better kind of primary care?</h2>
                            <p className="text-muted-foreground mb-6">
                                Telehealth-first Direct Primary Care membership with transparent pricing and direct physician access.
                            </p>
                            <Button size="lg" asChild>
                                <Link href="/join">Join Present Health</Link>
                            </Button>
                        </div>
                    </section>
                </article>

                <aside className="hidden lg:block">
                    <div className="sticky top-24 space-y-4">
                        {toc.length ? (
                            <Card className="border-border/60">
                                <CardHeader>
                                    <CardTitle className="text-base">Table of contents</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm">
                                    <nav aria-label="Table of contents" className="space-y-2">
                                        {toc.map((item) => (
                                            <div key={item.id} className={item.level === 3 ? "pl-4" : ""}>
                                                <a href={`#${item.id}`} className="text-muted-foreground hover:text-primary hover:underline">
                                                    {item.text}
                                                </a>
                                            </div>
                                        ))}
                                    </nav>
                                </CardContent>
                            </Card>
                        ) : null}

                        <Card className="border-border/60">
                            <CardHeader>
                                <CardTitle className="text-base">Explore</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-2">
                                <div>
                                    <Link href="/pricing" className="text-primary hover:underline">Pricing</Link>
                                </div>
                                <div>
                                    <Link href="/how-it-works" className="text-primary hover:underline">How it works</Link>
                                </div>
                                <div>
                                    <Link href="/states" className="text-primary hover:underline">States</Link>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </aside>
            </div>
        </div>
    );
}

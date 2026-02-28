import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { Markdown } from '@/components/markdown';
import { normalizeMarkdownForRender } from '@/lib/markdown-utils';
import { stripTemplateOwnedSections } from '@/lib/content-engine/sections';
import { DEFAULT_DISCLAIMER } from '@/lib/content-engine/disclaimer';
import { CLINICAL_TEAM_URL, EDITORIAL_POLICY_URL, formatLastUpdated } from '@/lib/content-engine/policy';

// ISR: revalidate every hour; also busted on-demand by the admin PATCH route.
export const revalidate = 3600;
export const runtime = 'nodejs';

function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function stripLeadingH1(markdown: string) {
    const trimmed = markdown.trimStart();
    if (!trimmed.startsWith('# ')) {
        return markdown;
    }
    return trimmed.replace(/^#\s+[^\n]*\n+/, '');
}

async function findArticle(slug: string | undefined) {
    if (!slug) return null;
    try {
        if (isUuid(slug)) {
            return await prisma.article.findUnique({ where: { id: slug } });
        }
        const bySlug = await prisma.article.findUnique({ where: { slug } });
        if (bySlug) return bySlug;
    } catch (error) {
        console.error('Blog article lookup failed', { slug, error });
    }
    try {
        return await prisma.article.findFirst({
            where: {
                status: 'PUBLISHED',
                slug
            }
        });
    } catch (error) {
        console.error('Blog article fallback lookup failed', { slug, error });
        return null;
    }
}

type SlugParams = { slug: string } | Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: SlugParams }): Promise<Metadata> {
    const { slug } = await params;
    const article = await findArticle(slug);

    if (!article || article.status !== 'PUBLISHED') {
        return {};
    }

    return {
        title: article.metaTitle || article.title,
        description: article.metaDescription || article.excerpt || undefined
    };
}

export default async function BlogPostPage({ params }: { params: SlugParams }) {
    const { slug } = await params;

    const article = await findArticle(slug);

    if (!article || article.status !== 'PUBLISHED') {
        notFound();
    }
    const disclaimer = (article.briefJson as any)?.disclaimer || DEFAULT_DISCLAIMER;
    const rawContent = stripTemplateOwnedSections(stripLeadingH1(article.content || ''));
    const content = normalizeMarkdownForRender(rawContent);

    const reviewerName = article.reviewedByDisplayName || 'Present Health Clinical Team';
    const isClinical = article.reviewType !== 'EDITORIAL';

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': ['Article', 'MedicalWebPage'],
        headline: article.title,
        description: article.metaDescription || article.excerpt || undefined,
        datePublished: (article.publishedAt || article.createdAt).toISOString(),
        dateModified: article.updatedAt.toISOString(),
        lastReviewed: (article.reviewedAt || article.updatedAt).toISOString(),
        author: {
            '@type': 'Organization',
            name: 'Present Health',
            url: 'https://presenthealthmd.com/about',
        },
        publisher: {
            '@type': 'Organization',
            name: 'Present Health',
            url: 'https://presenthealthmd.com',
        },
        reviewedBy: {
            '@type': 'Organization',
            name: reviewerName,
            url: 'https://presenthealthmd.com/clinical-team',
        },
        medicalAudience: {
            '@type': 'MedicalAudience',
            audienceType: 'Patient',
        },
    };

    return (
        <article className="container px-4 md:px-6 mx-auto py-24 max-w-3xl">
            <script
                type="application/ld+json"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Button variant="ghost" asChild className="mb-8 -ml-4 text-muted-foreground">
                <Link href="/blog">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Blog
                </Link>
            </Button>

            <header className="mb-12">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
                    {article.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                    <time>{format(new Date(article.publishedAt || article.createdAt), 'MMMM d, yyyy')}</time>
                    <span>•</span>
                    <span>By Present Health Team</span>
                </div>
                {/* E-E-A-T: Medically reviewed badge */}
                <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>
                        {isClinical ? 'Medically reviewed' : 'Editorially reviewed'} by{' '}
                        <strong className="font-medium">{reviewerName}</strong>
                        {article.reviewedAt ? (
                            <>
                                {' · '}
                                <time dateTime={article.reviewedAt.toISOString()}>
                                    {format(new Date(article.reviewedAt), 'MMM d, yyyy')}
                                </time>
                            </>
                        ) : null}
                    </span>
                </div>
            </header>

            <div className="space-y-4 mb-10">
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <span>{disclaimer.shortText}</span>
                    <details className="group">
                        <summary className="cursor-pointer text-primary text-sm">Read full disclaimer</summary>
                        <div className="mt-2 text-xs text-muted-foreground max-w-xl">
                            {disclaimer.fullText}
                        </div>
                    </details>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
                    <div className="font-semibold mb-1">Emergency guidance</div>
                    <div>{disclaimer.emergencyText}</div>
                </div>
            </div>

            <div className="prose prose-lg dark:prose-invert max-w-none">
                <Markdown content={content} />
            </div>

            <div className="mt-12 rounded-2xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                <div className="font-medium text-foreground mb-2">Reviewed by</div>
                <div className="space-y-1">
                    <div>{article.reviewedByDisplayName || 'Present Health Clinical Team'}</div>
                    <div>
                        <Link href={CLINICAL_TEAM_URL} className="text-primary hover:underline">
                            Clinical Team / Medical Review Process
                        </Link>
                    </div>
                    <div>
                        <Link href={EDITORIAL_POLICY_URL} className="text-primary hover:underline">
                            Editorial Policy
                        </Link>
                    </div>
                    <div>Last updated: {formatLastUpdated(new Date(article.updatedAt))}</div>
                </div>
            </div>

            <div className="mt-16 p-8 bg-muted/30 rounded-2xl border border-border text-center">
                <h3 className="text-2xl font-bold mb-4">Ready to prioritize your health?</h3>
                <p className="text-muted-foreground mb-6">
                    Join Present Health today for direct access to personalized primary care.
                </p>
                <Button size="lg" asChild>
                    <Link href="/pricing">Become a Member</Link>
                </Button>
            </div>
        </article>
    );
}

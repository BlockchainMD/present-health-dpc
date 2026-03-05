// DEPRECATED: /blog/[slug] is redirected to /learn/[slug] via next.config.ts.
// The canonical article route is /learn/[topicSlug]. This page is kept as a
// fallback but should not receive direct traffic.
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
import { AssessmentWidget } from '@/components/assessment/AssessmentWidget';

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
            </header>

            <div className="prose prose-lg dark:prose-invert max-w-none">
                <Markdown content={content} />
            </div>

            <footer className="mt-10 border-t border-border pt-4 text-xs text-muted-foreground space-y-1">
                <p>
                    {isClinical ? 'Medically reviewed' : 'Editorially reviewed'} by {reviewerName}
                    {article.reviewedAt ? ` · ${format(new Date(article.reviewedAt), 'MMM d, yyyy')}` : ''}
                    {' · '}Last updated: {formatLastUpdated(new Date(article.updatedAt))}
                </p>
                <p>
                    {disclaimer.shortText}{' '}
                    <Link href={EDITORIAL_POLICY_URL} className="underline hover:text-foreground">Full disclaimer &amp; editorial policy</Link>
                    {' · '}
                    <Link href={CLINICAL_TEAM_URL} className="underline hover:text-foreground">Clinical team</Link>
                </p>
                <p>{disclaimer.emergencyText}</p>
            </footer>

            <div className="mt-8">
                <AssessmentWidget articleSlug={article.slug || article.id} cluster={(article as any).cluster || undefined} compact />
            </div>

            <div className="mt-8 p-8 bg-muted/30 rounded-2xl border border-border text-center">
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

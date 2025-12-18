import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    const article = await prisma.article.findUnique({
        where: { id: slug }
    });

    if (!article || article.status !== 'PUBLISHED') {
        notFound();
    }

    return (
        <article className="container px-4 md:px-6 mx-auto py-24 max-w-3xl">
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
                <div className="flex items-center gap-4 text-muted-foreground text-sm">
                    <time>{format(new Date(article.createdAt), 'MMMM d, yyyy')}</time>
                    <span>•</span>
                    <span>By Present Health Team</span>
                </div>
            </header>

            <div className="prose prose-lg dark:prose-invert max-w-none">
                <ReactMarkdown>{article.content}</ReactMarkdown>
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

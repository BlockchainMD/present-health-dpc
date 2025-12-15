import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import Link from 'next/link';
import { Article } from '@prisma/client';
import ReactMarkdown from 'react-markdown';

export const revalidate = 60; // Revalidate every minute

async function getPublishedArticles() {
    try {
        return await prisma.article.findMany({
            where: { status: 'PUBLISHED' },
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        console.error('Failed to fetch published articles', error);
        return [];
    }
}

export default async function BlogPage() {
    const articles = await getPublishedArticles();

    return (
        <div className="container px-4 md:px-6 mx-auto py-24">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold tracking-tight mb-4">Health Insights</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Latest updates on primary care, health trends, and wellness from Present Health.
                </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {articles.map((article) => (
                    <Card key={article.id} className="flex flex-col h-full hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="text-xs text-muted-foreground mb-2">
                                {format(new Date(article.createdAt), 'MMMM d, yyyy')}
                            </div>
                            <CardTitle className="leading-tight hover:text-primary transition-colors">
                                <Link href={`/blog/${article.id}`}>
                                    {article.title}
                                </Link>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="text-muted-foreground line-clamp-4 text-sm prose prose-sm dark:prose-invert">
                                <ReactMarkdown>{article.content.substring(0, 200) + '...'}</ReactMarkdown>
                            </div>
                            <Link
                                href={`/blog/${article.id}`}
                                className="inline-flex items-center text-primary text-sm font-medium mt-4 hover:underline"
                            >
                                Read more
                            </Link>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {articles.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    No articles published yet. Check back soon!
                </div>
            )}
        </div>
    );
}

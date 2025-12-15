"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Trash2, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

interface Article {
    id: string;
    title: string;
    content: string;
    status: 'DRAFT' | 'PUBLISHED' | 'DISCARDED';
    sourceUrl: string;
    createdAt: string;
}

export default function PublishedPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            const res = await fetch('/api/admin/articles?status=PUBLISHED');
            const data = await res.json();
            if (data.success) {
                setArticles(data.articles);
            }
        } catch (error) {
            console.error('Failed to fetch articles', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUnpublish = async (id: string) => {
        setProcessingId(id);
        try {
            const res = await fetch(`/api/admin/articles/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'DRAFT' })
            });

            if (res.ok) {
                setArticles(prev => prev.filter(a => a.id !== id));
            }
        } catch (error) {
            console.error('Failed to unpublish', error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this article? This cannot be undone.')) {
            return;
        }

        setProcessingId(id);
        try {
            const res = await fetch(`/api/admin/articles/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setArticles(prev => prev.filter(a => a.id !== id));
            }
        } catch (error) {
            console.error('Failed to delete', error);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Published Articles</h2>
                <p className="text-muted-foreground">Manage your live blog content.</p>
            </div>

            {articles.length === 0 ? (
                <div className="text-center p-12 border border-dashed rounded-lg">
                    <p className="text-muted-foreground">No published articles yet.</p>
                    <Button variant="link" asChild className="mt-2">
                        <a href="/admin/review">Go to Review Drafts</a>
                    </Button>
                </div>
            ) : (
                <div className="grid gap-6">
                    {articles.map((article) => (
                        <Card key={article.id} className="overflow-hidden">
                            <CardHeader className="bg-green-50 dark:bg-green-900/20 pb-4">
                                <div className="flex justify-between items-start gap-4">
                                    <CardTitle className="text-xl leading-tight">{article.title}</CardTitle>
                                    <Badge className="bg-green-600">Published</Badge>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                    <span>Published {new Date(article.createdAt).toLocaleDateString()}</span>
                                    <Link
                                        href={`/blog/${article.id}`}
                                        target="_blank"
                                        className="text-primary hover:underline flex items-center gap-1"
                                    >
                                        View Live <ExternalLink className="h-3 w-3" />
                                    </Link>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 max-h-48 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{article.content.substring(0, 300) + '...'}</ReactMarkdown>
                            </CardContent>
                            <CardFooter className="bg-muted/10 flex justify-end gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => handleUnpublish(article.id)}
                                    disabled={!!processingId}
                                >
                                    {processingId === article.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    Unpublish
                                </Button>
                                <Button
                                    variant="outline"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDelete(article.id)}
                                    disabled={!!processingId}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

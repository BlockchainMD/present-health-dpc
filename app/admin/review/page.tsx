"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2, ExternalLink } from 'lucide-react';

interface Article {
    id: string;
    title: string;
    content: string;
    status: 'DRAFT' | 'PUBLISHED' | 'DISCARDED';
    sourceUrl: string;
    createdAt: string;
}

export default function ReviewPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            const res = await fetch('/api/admin/articles?status=DRAFT');
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

    const handleStatusUpdate = async (id: string, newStatus: 'PUBLISHED' | 'DISCARDED') => {
        setProcessingId(id);
        try {
            const res = await fetch(`/api/admin/articles/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                // Remove from list
                setArticles(prev => prev.filter(a => a.id !== id));
            }
        } catch (error) {
            console.error('Failed to update status', error);
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
                <h2 className="text-3xl font-bold tracking-tight">Review Drafts</h2>
                <p className="text-muted-foreground">Approve or discard AI-generated content.</p>
            </div>

            {articles.length === 0 ? (
                <div className="text-center p-12 border border-dashed rounded-lg">
                    <p className="text-muted-foreground">No drafts pending review.</p>
                    <Button variant="link" asChild className="mt-2">
                        <a href="/admin">Go to Generator</a>
                    </Button>
                </div>
            ) : (
                <div className="grid gap-6">
                    {articles.map((article) => (
                        <Card key={article.id} className="overflow-hidden">
                            <CardHeader className="bg-muted/30 pb-4">
                                <div className="flex justify-between items-start gap-4">
                                    <CardTitle className="text-xl leading-tight">{article.title}</CardTitle>
                                    <Badge variant="outline">AI Draft</Badge>
                                </div>
                                {article.sourceUrl && (
                                    <a
                                        href={article.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                                    >
                                        Source: {new URL(article.sourceUrl).hostname} <ExternalLink className="h-3 w-3" />
                                    </a>
                                )}
                            </CardHeader>
                            <CardContent className="pt-6 max-h-64 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
                                <div className="whitespace-pre-wrap">{article.content}</div>
                            </CardContent>
                            <CardFooter className="bg-muted/10 flex justify-end gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleStatusUpdate(article.id, 'DISCARDED')}
                                    disabled={!!processingId}
                                >
                                    {processingId === article.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                                    Discard
                                </Button>
                                <Button
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleStatusUpdate(article.id, 'PUBLISHED')}
                                    disabled={!!processingId}
                                >
                                    {processingId === article.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                                    Publish
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

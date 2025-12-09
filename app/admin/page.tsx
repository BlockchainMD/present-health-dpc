"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<{ count: number } | null>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch('/api/admin/generate', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setResult({ count: data.count });
            }
        } catch (error) {
            console.error('Failed to generate', error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Content Engine</h2>
                <p className="text-muted-foreground">Manage your AI-driven content pipeline.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Generator Card */}
                <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Trend Generator
                        </CardTitle>
                        <CardDescription>
                            Scrape Google Trends & News to find salient topics, then generate 5 draft articles.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {result ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-background rounded-lg border border-border">
                                    <p className="font-medium text-green-600">Successfully generated {result.count} drafts!</p>
                                </div>
                                <Button asChild className="w-full">
                                    <Link href="/admin/review">
                                        Review Drafts <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button variant="ghost" onClick={() => setResult(null)} className="w-full">
                                    Generate More
                                </Button>
                            </div>
                        ) : (
                            <Button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                size="lg"
                                className="w-full"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Analyzing Trends...
                                    </>
                                ) : (
                                    "Run Content Engine"
                                )}
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Stats Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Stats</CardTitle>
                        <CardDescription>Overview of your content pipeline.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                            <span className="text-sm font-medium">Drafts Pending Review</span>
                            <span className="text-xl font-bold">--</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                            <span className="text-sm font-medium">Published Articles</span>
                            <span className="text-xl font-bold">--</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

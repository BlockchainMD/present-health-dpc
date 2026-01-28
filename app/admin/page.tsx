"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Loader2, ArrowRight, Rocket, Megaphone } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<{ count: number; published: number; warnings?: string[] } | null>(null);
    const [seoHealth, setSeoHealth] = useState<{ status: 'GREEN' | 'YELLOW' | 'RED'; indexRate: number; updatedAt?: string } | null>(null);
    const [count, setCount] = useState(5);
    const [mode, setMode] = useState<'BALANCED' | 'TREND' | 'RESEARCH'>('BALANCED');
    const [autoPublish, setAutoPublish] = useState(false);
    const [useFeedback, setUseFeedback] = useState(true);
    const [reviewType, setReviewType] = useState<'CLINICAL' | 'EDITORIAL'>('CLINICAL');
    const [reviewLabel, setReviewLabel] = useState('Present Health Clinical Team');
    const [sources, setSources] = useState({
        trends: true,
        news: true,
        pubmed: true,
        trials: true,
        nih: true,
        cdc: false,
        curated: true
    });

    useEffect(() => {
        setReviewLabel((prev) => {
            if (reviewType === 'EDITORIAL' && prev === 'Present Health Clinical Team') {
                return 'Present Health Editorial Team';
            }
            if (reviewType === 'CLINICAL' && prev === 'Present Health Editorial Team') {
                return 'Present Health Clinical Team';
            }
            return prev;
        });
    }, [reviewType]);

    useEffect(() => {
        const loadSeoHealth = async () => {
            try {
                const res = await fetch('/api/admin/seo-health');
                const data = await res.json();
                if (data.success) {
                    setSeoHealth({
                        status: data.report.status,
                        indexRate: data.report.indexRate,
                        updatedAt: data.meta?.updatedAt
                    });
                }
            } catch {
                // Ignore SEO health errors on dashboard.
            }
        };
        loadSeoHealth();
    }, []);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            let remaining = count;
            let total = 0;
            let published = 0;

            while (remaining > 0) {
                const batchSize = Math.min(10, remaining);
                const res = await fetch('/api/admin/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        count: batchSize,
                        mode,
                        autoPublish,
                        useFeedback,
                        reviewType,
                        reviewLabel,
                        sources
                    })
                });
                const data = await res.json();
                if (!data.success) break;
                total += data.count;
                published += data.published || 0;
                if (data.warnings?.length) {
                    setResult(prev => ({
                        count: prev?.count || 0,
                        published: prev?.published || 0,
                        warnings: [...(prev?.warnings || []), ...data.warnings]
                    }));
                }
                remaining -= batchSize;
            }

            setResult((prev) => ({
                count: total,
                published,
                warnings: prev?.warnings || []
            }));
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

            {seoHealth && seoHealth.status !== 'GREEN' && (
                <Card className={seoHealth.status === 'RED' ? 'border-red-500/40' : 'border-yellow-500/40'}>
                    <CardContent className="py-4 text-sm flex flex-col gap-1">
                        <div className="font-semibold">
                            SEO Health: {seoHealth.status} • Index rate {seoHealth.indexRate}%
                        </div>
                        <p className="text-muted-foreground">
                            {seoHealth.status === 'RED'
                                ? 'Publishing may be paused. Review SEO Health for details.'
                                : 'Keep an eye on indexing. Review SEO Health for details.'}
                        </p>
                        {seoHealth.updatedAt && (
                            <p className="text-xs text-muted-foreground">Updated {new Date(seoHealth.updatedAt).toLocaleString()}</p>
                        )}
                    </CardContent>
                </Card>
            )}

            <div className="grid md:grid-cols-2 gap-6">
                {/* Generator Card */}
                <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Content Engine v2
                        </CardTitle>
                        <CardDescription>
                            Blend trends, research, and evergreen topics to generate diverse drafts.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {result ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-background rounded-lg border border-border">
                                    <p className="font-medium text-green-600">Successfully generated {result.count} drafts!</p>
                                    {result.published > 0 && (
                                        <p className="text-sm text-muted-foreground">{result.published} auto-published.</p>
                                    )}
                                    {result.warnings && result.warnings.length > 0 && (
                                        <div className="mt-2 space-y-1 text-xs text-amber-700">
                                            {result.warnings.map((warning, index) => (
                                                <p key={`${warning}-${index}`}>{warning}</p>
                                            ))}
                                        </div>
                                    )}
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
                            <div className="space-y-4">
                                <div className="grid gap-3">
                                    <div className="grid gap-2">
                                        <Label htmlFor="count">Total drafts to generate (runs in batches of 10)</Label>
                                        <Input
                                            id="count"
                                            type="number"
                                            min={1}
                                            value={count}
                                            onChange={(e) => {
                                                const next = Number(e.target.value);
                                                setCount(Number.isFinite(next) && next > 0 ? next : 1);
                                            }}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="mode">Mode</Label>
                                        <select
                                            id="mode"
                                            value={mode}
                                            onChange={(e) => setMode(e.target.value as 'BALANCED' | 'TREND' | 'RESEARCH')}
                                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        >
                                            <option value="BALANCED">Balanced (best for SEO)</option>
                                            <option value="TREND">Trend-heavy</option>
                                            <option value="RESEARCH">Research-heavy</option>
                                        </select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Source mix</Label>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                            {([
                                                ['trends', 'Google Trends'],
                                                ['news', 'Google News'],
                                                ['pubmed', 'PubMed'],
                                                ['trials', 'ClinicalTrials.gov'],
                                                ['nih', 'NIH News'],
                                                ['cdc', 'CDC News'],
                                                ['curated', 'Curated Evergreen']
                                            ] as const).map(([key, label]) => (
                                                <label key={key} className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4"
                                                        checked={sources[key]}
                                                        onChange={(e) => setSources(prev => ({ ...prev, [key]: e.target.checked }))}
                                                    />
                                                    {label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="reviewLabel">Reviewer label</Label>
                                        <Input
                                            id="reviewLabel"
                                            value={reviewLabel}
                                            onChange={(e) => setReviewLabel(e.target.value)}
                                            placeholder="Present Health Clinical Team"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="reviewType">Review type</Label>
                                        <select
                                            id="reviewType"
                                            value={reviewType}
                                            onChange={(e) => setReviewType(e.target.value as 'CLINICAL' | 'EDITORIAL')}
                                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        >
                                            <option value="CLINICAL">Clinical</option>
                                            <option value="EDITORIAL">Editorial</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                                        <div>
                                            <Label htmlFor="autoPublish" className="text-sm font-medium">Auto-publish low-risk</Label>
                                            <p className="text-xs text-muted-foreground">Only LOW risk drafts publish automatically (daily cap applies).</p>
                                        </div>
                                        <Switch
                                            id="autoPublish"
                                            checked={autoPublish}
                                            onCheckedChange={setAutoPublish}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                                        <div>
                                            <Label htmlFor="useFeedback" className="text-sm font-medium">Use performance feedback</Label>
                                            <p className="text-xs text-muted-foreground">Weights topic selection using CTR data.</p>
                                        </div>
                                        <Switch
                                            id="useFeedback"
                                            checked={useFeedback}
                                            onCheckedChange={setUseFeedback}
                                        />
                                    </div>
                                </div>
                                <Button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    size="lg"
                                    className="w-full"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating Drafts...
                                        </>
                                    ) : (
                                        "Run Content Engine"
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Ad Engine Card */}
                <Card className="bg-gradient-to-br from-indigo-500/5 to-transparent border-indigo-500/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Megaphone className="h-5 w-5 text-indigo-500" />
                            Ad Engine
                        </CardTitle>
                        <CardDescription>
                            Generate Google Search Ads and Landing Pages with zero-cost AI workflows.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-background rounded-lg border border-border">
                            <p className="text-sm">Leverage ChatGPT Pro High for premium asset generation.</p>
                        </div>
                        <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700">
                            <Link href="/admin/campaigns">
                                Manage Campaigns <Rocket className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
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

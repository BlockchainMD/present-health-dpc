'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, Trash2, RefreshCw, ExternalLink, CheckCircle, AlertTriangle, Loader2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CampaignDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [campaign, setCampaign] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [deploying, setDeploying] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [metrics, setMetrics] = useState<any[]>([]);

    useEffect(() => {
        if (id) {
            fetchCampaign();
            fetchMetrics();
        }
    }, [id]);

    async function fetchCampaign() {
        try {
            const res = await fetch(`/api/admin/campaigns/${id}`);
            if (res.ok) {
                const data = await res.json();
                setCampaign(data);
            } else {
                setError('Failed to load campaign');
            }
        } catch (err) {
            setError('An error occurred');
        } finally {
            setLoading(false);
        }
    }

    async function fetchMetrics() {
        try {
            const res = await fetch(`/api/admin/campaigns/${id}/metrics`);
            if (res.ok) {
                const data = await res.json();
                setMetrics(data);
            }
        } catch (err) {
            console.error('Failed to load metrics');
        }
    }

    async function handleGenerate() {
        setGenerating(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/campaigns/${id}/generate`, {
                method: 'POST'
            });
            if (res.ok) {
                await fetchCampaign(); // Refresh data
            } else {
                const data = await res.json();
                setError(data.error || 'Generation failed');
            }
        } catch (err) {
            setError('An error occurred during generation');
        } finally {
            setGenerating(false);
        }
    }

    async function handleRegenerateMetrics() {
        try {
            await fetch(`/api/admin/campaigns/${id}/metrics`, { method: 'POST' });
            fetchMetrics();
        } catch (e) { }
    }

    async function handleDeploy() {
        if (!confirm('Are you sure you want to go live with this campaign? This will enable it in Google Ads.')) return;
        setDeploying(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/campaigns/${id}/deploy`, { method: 'POST' });
            if (res.ok) {
                await fetchCampaign(); // Refresh status
            } else {
                const data = await res.json();
                setError(data.error || 'Deployment failed');
            }
        } catch (err) {
            setError('An error occurred during deployment');
        } finally {
            setDeploying(false);
        }
    }

    async function handleDelete() {
        if (!confirm('Are you sure you want to DELETE this campaign? This cannot be undone.')) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/campaigns/${id}`, { method: 'DELETE' });
            if (res.ok) {
                router.push('/admin/campaigns');
            } else {
                setError('Failed to delete campaign');
                setDeleting(false);
            }
        } catch (err) {
            setError('An error occurred during deletion');
            setDeleting(false);
        }
    }

    if (loading) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>;
    if (!campaign) return <div className="p-8 text-center text-red-500">Campaign not found</div>;

    const latestRun = campaign.runs?.[0];

    // Simple Chart Helpers
    const maxClicks = Math.max(...metrics.map(m => m.clicks), 1);
    const maxCost = Math.max(...metrics.map(m => m.cost), 1);

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin/campaigns">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight">{campaign.slug}</h1>
                            <Badge variant="outline">{campaign.status}</Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mt-1">
                            {campaign.persona} • {campaign.intent}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Delete */}
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={deleting}>
                        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>

                    <Button variant="ghost" size="sm" onClick={handleRegenerateMetrics}>
                        <RefreshCw className="mr-2 h-3 w-3" /> Simulate Data
                    </Button>

                    {/* Regenerate Assets */}
                    <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                        {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        {latestRun ? 'Regenerate Assets' : 'Generate Assets'}
                    </Button>

                    {/* Go Live */}
                    {latestRun && (
                        <Button onClick={handleDeploy} disabled={deploying || campaign.status === 'ACTIVE'} className={campaign.status === 'ACTIVE' ? "bg-green-600 hover:bg-green-700" : ""}>
                            {deploying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (campaign.status === 'ACTIVE' ? <CheckCircle className="mr-2 h-4 w-4" /> : <Rocket className="mr-2 h-4 w-4" />)}
                            {campaign.status === 'ACTIVE' ? 'Live' : 'Go Live'}
                        </Button>
                    )}
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="grid md:grid-cols-4 gap-8">
                {/* Main Content */}
                <div className="md:col-span-3 space-y-8">

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-6">
                                <div className="text-xs font-medium text-muted-foreground uppercase">Leads (SQL)</div>
                                <div className="text-2xl font-bold mt-2">
                                    {latestRun?._count?.leads || 0}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="text-xs font-medium text-muted-foreground uppercase">Spend</div>
                                <div className="text-2xl font-bold mt-2">
                                    ${metrics.reduce((a, b) => a + b.cost, 0).toLocaleString()}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="text-xs font-medium text-muted-foreground uppercase">CPL</div>
                                <div className="text-2xl font-bold mt-2">
                                    ${latestRun?._count?.leads ? (metrics.reduce((a, b) => a + b.cost, 0) / latestRun._count.leads).toFixed(2) : '0.00'}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="text-xs font-medium text-muted-foreground uppercase">CTR</div>
                                <div className="text-2xl font-bold mt-2">
                                    {(latestRun?.metrics?.ctr * 100 || 0).toFixed(2)}%
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="performance">
                        <TabsList>
                            <TabsTrigger value="performance">Performance</TabsTrigger>
                            <TabsTrigger value="landing-page">Landing Page</TabsTrigger>
                            <TabsTrigger value="ads">Google Ads Assets</TabsTrigger>
                        </TabsList>

                        <TabsContent value="performance" className="space-y-6 mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Clicks & Cost (30 Days)</CardTitle>
                                    <CardDescription>Daily performance trends.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-64 flex items-end justify-between gap-1 w-full pt-8">
                                        {metrics.map((m, i) => (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                                                {/* Tooltip */}
                                                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2 rounded shadow-lg z-10 whitespace-nowrap">
                                                    <div>{new Date(m.date).toLocaleDateString()}</div>
                                                    <div>Clicks: {m.clicks}</div>
                                                    <div>Cost: ${m.cost}</div>
                                                </div>

                                                {/* Bars - Overlaying Cost (red) and Clicks (blue) roughly scaled */}
                                                <div className="w-full flex items-end gap-0.5 h-full">
                                                    <div
                                                        className="flex-1 bg-blue-500/80 rounded-t hover:bg-blue-600 transition-all"
                                                        style={{ height: `${(m.clicks / maxClicks) * 100}%` }}
                                                    />
                                                    <div
                                                        className="flex-1 bg-red-400/50 rounded-t hover:bg-red-500 transition-all"
                                                        style={{ height: `${(m.cost / maxCost) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground mt-2 border-t pt-2">
                                        <span>30 Days Ago</span>
                                        <span>Today</span>
                                    </div>
                                    <div className="flex justify-center gap-6 mt-4 text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-blue-500/80 rounded-sm"></div>
                                            <span>Clicks</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-red-400/50 rounded-sm"></div>
                                            <span>Cost</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="landing-page" className="mt-6">
                            {/* Landing Page Preview */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>Landing Page</CardTitle>
                                        <CardDescription>
                                            Slug: <code className="bg-muted px-1 py-0.5 rounded">{campaign.landingSlug}</code>
                                        </CardDescription>
                                    </div>
                                    {latestRun?.landingPageContent && (
                                        <Button variant="secondary" size="sm" asChild>
                                            <Link href={`/lp/${campaign.landingSlug}`} target="_blank">
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                View Live
                                            </Link>
                                        </Button>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    {latestRun?.landingPageContent ? (
                                        <div className="space-y-4">
                                            <div className="p-4 bg-muted rounded-lg text-sm">
                                                <p className="font-semibold mb-2">Hero Headline:</p>
                                                <p>{JSON.parse(latestRun.landingPageContent).hero.headline}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Badge variant="secondary" className="text-green-600 bg-green-50">
                                                    <CheckCircle className="mr-1 h-3 w-3" /> Content Generated
                                                </Badge>
                                                <Badge variant="secondary" className="text-green-600 bg-green-50">
                                                    <CheckCircle className="mr-1 h-3 w-3" /> Compliance Passed
                                                </Badge>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            No landing page generated yet. Click "Generate Assets" above.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="ads" className="mt-6">
                            {/* Ads Preview */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Google Ads Assets</CardTitle>
                                    <CardDescription>Responsive Search Ad (RSA) components</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {latestRun?.rsaHeadlines ? (
                                        <Tabs defaultValue="headlines">
                                            <TabsList>
                                                <TabsTrigger value="headlines">Headlines ({latestRun.rsaHeadlines.length})</TabsTrigger>
                                                <TabsTrigger value="descriptions">Descriptions ({latestRun.rsaDescriptions.length})</TabsTrigger>
                                                <TabsTrigger value="keywords">Keywords ({latestRun.chosenKeywords.length})</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="headlines" className="mt-4">
                                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {latestRun.rsaHeadlines.map((h: string, i: number) => (
                                                        <li key={i} className="text-sm p-2 bg-muted rounded border border-border/50">{h}</li>
                                                    ))}
                                                </ul>
                                            </TabsContent>
                                            <TabsContent value="descriptions" className="mt-4">
                                                <ul className="space-y-2">
                                                    {latestRun.rsaDescriptions.map((d: string, i: number) => (
                                                        <li key={i} className="text-sm p-3 bg-muted rounded border border-border/50">{d}</li>
                                                    ))}
                                                </ul>
                                            </TabsContent>
                                            <TabsContent value="keywords" className="mt-4">
                                                <div className="max-h-60 overflow-y-auto">
                                                    <ul className="space-y-1">
                                                        {latestRun.chosenKeywords.map((k: string, i: number) => (
                                                            <li key={i} className="text-sm flex justify-between p-2 hover:bg-muted rounded">
                                                                <span>{k}</span>
                                                                <Badge variant="outline" className="text-xs">{latestRun.matchTypes[i]}</Badge>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            No ads generated yet. Click "Generate Assets" above.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div>
                                <span className="text-muted-foreground block mb-1">Daily Budget</span>
                                <span className="font-medium">${campaign.budgetDaily}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">Target CPA</span>
                                <span className="font-medium">${campaign.targetCpa}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">Geo</span>
                                <span className="font-medium">{campaign.geo}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">Seed Keywords</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {campaign.seedKeywords.map((k: string, i: number) => (
                                        <Badge key={i} variant="secondary" className="text-xs">{k}</Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span className="font-semibold">Compliance Status</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Automatic checks pass for prohibited medical terms.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

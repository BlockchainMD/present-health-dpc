'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, Trash2, RefreshCw, ExternalLink, CheckCircle, AlertTriangle, Loader2, Rocket, Copy, Upload, Info, Check } from 'lucide-react';
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
    const [showManual, setShowManual] = useState(false);
    const [manualJson, setManualJson] = useState('');
    const [promptText, setPromptText] = useState('');
    const [importing, setImporting] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [approving, setApproving] = useState(false);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['GOOGLE_ADS', 'META_ADS']);
    const [platformMetrics, setPlatformMetrics] = useState<{ google: any[], meta: any[] }>({ google: [], meta: [] });

    useEffect(() => {
        if (id) {
            fetchCampaign();
            fetchPlatformMetrics();
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

    async function fetchPlatformMetrics() {
        try {
            const [googleRes, metaRes] = await Promise.all([
                fetch(`/api/admin/campaigns/${id}/metrics?platform=GOOGLE_ADS`),
                fetch(`/api/admin/campaigns/${id}/metrics?platform=META_ADS`)
            ]);

            const [googleData, metaData] = await Promise.all([
                googleRes.ok ? googleRes.json() : [],
                metaRes.ok ? metaRes.json() : []
            ]);

            setPlatformMetrics({
                google: googleData,
                meta: metaData
            });

            // For backward compatibility with simpler UI elements
            setMetrics([...googleData, ...metaData]);
        } catch (err) {
            console.error('Failed to load platform metrics');
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
            fetchPlatformMetrics();
        } catch (e) { }
    }

    async function handleApproveAdPlan() {
        const adPlanAsset = campaign?.assets?.find((a: any) => a.type === 'AD_PLAN');
        if (!adPlanAsset) {
            setError('No Ad Plan found to approve.');
            return;
        }
        setApproving(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/assets/${adPlanAsset.id}/approve`, { method: 'POST' });
            if (res.ok) {
                await fetchCampaign(); // Refresh to get updated asset status
            } else {
                const data = await res.json();
                setError(data.error || 'Approval failed');
            }
        } catch (err) {
            setError('An error occurred during approval');
        } finally {
            setApproving(false);
        }
    }

    async function handleDeploy() {
        if (!confirm('Are you sure you want to go live with this campaign? This will enable it in Google Ads and Meta Ads (if configured).')) return;
        setDeploying(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/campaigns/${id}/deploy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platforms: selectedPlatforms })
            });
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

    async function fetchPrompt() {
        try {
            const res = await fetch(`/api/admin/campaigns/${id}/prompt`);
            if (res.ok) {
                const data = await res.json();
                setPromptText(data.prompt);
                setShowManual(true);
            }
        } catch (e) {
            setError('Failed to fetch prompt template');
        }
    }

    async function handleCopyPrompt() {
        await navigator.clipboard.writeText(promptText);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    }

    async function handleImport() {
        if (!manualJson) return;
        setImporting(true);
        setError(null);
        try {
            let parsed;
            try {
                parsed = JSON.parse(manualJson);
            } catch (e) {
                throw new Error('Invalid JSON format. Please ensure you copied the entire output.');
            }

            const res = await fetch(`/api/admin/campaigns/${id}/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsed)
            });

            if (res.ok) {
                setManualJson('');
                setShowManual(false);
                await fetchCampaign();
            } else {
                const data = await res.json();
                setError(data.error || 'Import failed');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during import');
        } finally {
            setImporting(false);
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
    const hasGoogleIds = latestRun?.googleCampaignId && latestRun?.googleCustomerId;

    const getGoogleAdsLink = () => {
        if (!hasGoogleIds) return '#';
        const campaignId = latestRun.googleCampaignId.split('/').pop();
        const customerId = latestRun.googleCustomerId.replace(/-/g, '');
        return `https://ads.google.com/aw/campaigns?campaignId=${campaignId}&__c=${customerId}`;
    };

    const hasMetaIds = latestRun?.metaCampaignId && latestRun?.metaAdsResourceIds?.accountId;
    const getMetaAdsLink = () => {
        if (!hasMetaIds) return '#';
        const campaignId = latestRun.metaCampaignId;
        const accountId = latestRun.metaAdsResourceIds.accountId.replace('act_', '');
        return `https://www.facebook.com/adsmanager/manage/campaigns?act=${accountId}&selected_campaign_ids=${campaignId}`;
    };

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

                    {/* Manual Workflow */}
                    <Button variant="outline" onClick={showManual ? () => setShowManual(false) : fetchPrompt}>
                        <Copy className="mr-2 h-4 w-4" />
                        {showManual ? 'Hide Manual' : 'ChatGPT Workflow'}
                    </Button>

                    {/* Regenerate Assets */}
                    <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                        {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        {latestRun ? 'Auto-Generate' : 'Auto-Generate'}
                    </Button>

                    {/* Approve Ad Plan */}
                    {latestRun && (() => {
                        const adPlanAsset = campaign?.assets?.find((a: any) => a.type === 'AD_PLAN');
                        const isApproved = adPlanAsset?.status === 'APPROVED';
                        return adPlanAsset && !isApproved ? (
                            <Button variant="secondary" onClick={handleApproveAdPlan} disabled={approving} className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200">
                                {approving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                Approve Ad Plan
                            </Button>
                        ) : isApproved ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1.5">
                                <CheckCircle className="mr-1 h-3 w-3" /> Ad Plan Approved
                            </Badge>
                        ) : null;
                    })()}

                    {/* Platform Selector */}
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Deploy To</span>
                        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50">
                            <Button
                                variant={selectedPlatforms.includes('GOOGLE_ADS') ? 'default' : 'ghost'}
                                size="sm"
                                className={`h-7 text-xs px-3 transition-all ${selectedPlatforms.includes('GOOGLE_ADS') ? 'shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                onClick={() => setSelectedPlatforms(prev =>
                                    prev.includes('GOOGLE_ADS') ? prev.filter(p => p !== 'GOOGLE_ADS') : [...prev, 'GOOGLE_ADS']
                                )}
                            >
                                {selectedPlatforms.includes('GOOGLE_ADS') && <Check className="mr-1.5 h-3 w-3" />}
                                Google
                            </Button>
                            <Button
                                variant={selectedPlatforms.includes('META_ADS') ? 'default' : 'ghost'}
                                size="sm"
                                className={`h-7 text-xs px-3 transition-all ${selectedPlatforms.includes('META_ADS') ? 'shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                onClick={() => setSelectedPlatforms(prev =>
                                    prev.includes('META_ADS') ? prev.filter(p => p !== 'META_ADS') : [...prev, 'META_ADS']
                                )}
                            >
                                {selectedPlatforms.includes('META_ADS') && <Check className="mr-1.5 h-3 w-3" />}
                                Meta
                            </Button>
                        </div>
                    </div>


                    {/* Go Live */}
                    {latestRun && (
                        <Button onClick={handleDeploy} disabled={deploying || campaign.status === 'ACTIVE' || selectedPlatforms.length === 0} className={campaign.status === 'ACTIVE' ? "bg-green-600 hover:bg-green-700" : ""}>
                            {deploying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (campaign.status === 'ACTIVE' ? <CheckCircle className="mr-2 h-4 w-4" /> : <Rocket className="mr-2 h-4 w-4" />)}
                            {campaign.status === 'ACTIVE' ? 'Live' : 'Go Live'}
                        </Button>
                    )}
                </div>
            </div>

            {showManual && (
                <Card className="border-primary/50 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5 text-primary" />
                            ChatGPT Pro High Workflow
                        </CardTitle>
                        <CardDescription>
                            Leverage your own AI subscription for free by copying the prompt below into ChatGPT Pro High and pasting the result back.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">1. Copy this mega-prompt</label>
                                <Button size="sm" variant="outline" onClick={handleCopyPrompt}>
                                    {copySuccess ? 'Copied!' : <><Copy className="mr-2 h-3 w-3" /> Copy Prompt</>}
                                </Button>
                            </div>
                            <div className="bg-muted p-4 rounded-md h-32 overflow-y-auto text-xs whitespace-pre-wrap font-mono border">
                                {promptText}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">2. Paste the JSON output here</label>
                            <textarea
                                className="w-full h-32 p-3 text-xs font-mono border rounded-md bg-background focus:ring-2 focus:ring-primary outline-none"
                                placeholder='{ "adPlan": { ... }, "landingPageSpec": { ... } }'
                                value={manualJson}
                                onChange={(e) => setManualJson(e.target.value)}
                            />
                        </div>

                        <Button className="w-full" onClick={handleImport} disabled={importing || !manualJson}>
                            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Import Assets
                        </Button>
                    </CardContent>
                </Card>
            )}

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
                            <TabsTrigger value="ads">Ad Assets</TabsTrigger>
                        </TabsList>

                        <TabsContent value="performance" className="space-y-6 mt-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Google Ads Performance */}
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                Google Ads
                                            </CardTitle>
                                            <CardDescription>30-day performance</CardDescription>
                                        </div>
                                        {hasGoogleIds && (
                                            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                                                <a href={getGoogleAdsLink()} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-40 flex items-end justify-between gap-1 w-full pt-4">
                                            {platformMetrics.google.map((m, i) => (
                                                <div key={i} className="flex-1 bg-blue-500/80 rounded-t hover:bg-blue-600 transition-all"
                                                    style={{ height: `${(m.clicks / Math.max(...platformMetrics.google.map(x => x.clicks), 1)) * 100}%` }}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex justify-between text-[10px] text-muted-foreground mt-2 uppercase font-medium">
                                            <span>Start</span>
                                            <span>End</span>
                                        </div>
                                        <div className="mt-4 grid grid-cols-2 gap-4 text-center border-t pt-4">
                                            <div>
                                                <div className="text-xs text-muted-foreground">Clicks</div>
                                                <div className="text-lg font-bold">{platformMetrics.google.reduce((a, b) => a + b.clicks, 0)}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground">Spend</div>
                                                <div className="text-lg font-bold">${platformMetrics.google.reduce((a, b) => a + b.cost, 0).toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Meta Ads Performance */}
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-pink-500" />
                                                Meta Ads
                                            </CardTitle>
                                            <CardDescription>30-day performance</CardDescription>
                                        </div>
                                        {hasMetaIds && (
                                            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                                                <a href={getMetaAdsLink()} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-40 flex items-end justify-between gap-1 w-full pt-4">
                                            {platformMetrics.meta.map((m, i) => (
                                                <div key={i} className="flex-1 bg-pink-500/80 rounded-t hover:bg-pink-600 transition-all"
                                                    style={{ height: `${(m.clicks / Math.max(...platformMetrics.meta.map(x => x.clicks), 1)) * 100}%` }}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex justify-between text-[10px] text-muted-foreground mt-2 uppercase font-medium">
                                            <span>Start</span>
                                            <span>End</span>
                                        </div>
                                        <div className="mt-4 grid grid-cols-2 gap-4 text-center border-t pt-4">
                                            <div>
                                                <div className="text-xs text-muted-foreground">Clicks</div>
                                                <div className="text-lg font-bold">{platformMetrics.meta.reduce((a, b) => a + b.clicks, 0)}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground">Spend</div>
                                                <div className="text-lg font-bold">${platformMetrics.meta.reduce((a, b) => a + b.cost, 0).toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
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

                        <TabsContent value="ads" className="mt-6 space-y-6">
                            {/* Google Ads Preview */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>Google Ads Assets</CardTitle>
                                        {latestRun?.googleSyncStatus === 'OK' && (
                                            <Badge className="bg-green-100 text-green-700">Deployed</Badge>
                                        )}
                                    </div>
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
                                            No google ads generated yet.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Meta Ads Preview */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>Meta Ads Assets</CardTitle>
                                        {latestRun?.metaSyncStatus === 'OK' && (
                                            <Badge className="bg-green-100 text-green-700">Deployed</Badge>
                                        )}
                                    </div>
                                    <CardDescription>Facebook & Instagram ad creative</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {latestRun?.metaCampaignId ? (
                                        <div className="space-y-4">
                                            <div className="p-4 bg-muted rounded-lg border border-border/50">
                                                <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Primary Text</div>
                                                <p className="text-sm">{latestRun.rsaDescriptions[0]}</p>
                                            </div>
                                            <div className="p-4 bg-muted rounded-lg border border-border/50">
                                                <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Headline</div>
                                                <p className="text-sm font-medium">{latestRun.rsaHeadlines[0]}</p>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-muted/50 rounded text-xs">
                                                <span className="text-muted-foreground">Campaign ID:</span>
                                                <code className="font-mono">{latestRun.metaCampaignId}</code>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            Not yet synced to Meta Ads.
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
                            {campaign.geoStates && campaign.geoStates.length > 0 && (
                                <div>
                                    <span className="text-muted-foreground block mb-1">Licensed States</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {campaign.geoStates.map((state: string, i: number) => (
                                            <Badge key={i} variant="outline" className="text-xs">{state}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
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

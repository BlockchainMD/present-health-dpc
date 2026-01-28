"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, ShieldAlert, ShieldCheck, ShieldEllipsis } from 'lucide-react';

type SeoHealthReport = {
    status: 'GREEN' | 'YELLOW' | 'RED';
    indexRate: number;
    indexedCount: number;
    sampleCount: number;
    impressions: number;
    clicks: number;
    failedUrls: Array<{ url: string; reason: string }>;
    warnings: string[];
    window: { startDate: string; endDate: string };
};

type SeoHealthConfig = {
    sampleSize: number;
    inspectionDays: number;
    trafficDays: number;
    autoRefreshHours: number;
    inspectionDailyLimit: number;
    inspectionConcurrency: number;
    stopPublishingOnRed: boolean;
    pauseDraftsOnRed: boolean;
};

type SeoHealthMeta = {
    updatedAt: string;
    cached: boolean;
    stale: boolean;
    config: SeoHealthConfig;
};

function statusMeta(status: SeoHealthReport['status']) {
    switch (status) {
        case 'GREEN':
            return { label: 'Healthy', color: 'bg-green-500', icon: ShieldCheck };
        case 'YELLOW':
            return { label: 'Watch', color: 'bg-yellow-500', icon: ShieldEllipsis };
        case 'RED':
            return { label: 'Critical', color: 'bg-red-500', icon: ShieldAlert };
        default:
            return { label: 'Unknown', color: 'bg-muted', icon: ShieldEllipsis };
    }
}

export default function SeoHealthPage() {
    const [report, setReport] = useState<SeoHealthReport | null>(null);
    const [metaState, setMetaState] = useState<SeoHealthMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const loadReport = async (refresh = false) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/seo-health${refresh ? '?refresh=1' : ''}`);
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to load SEO health');
            }
            setReport(data.report);
            setMetaState(data.meta);
        } catch (err: any) {
            setError(err?.message || 'Failed to load SEO health');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReport();
    }, []);

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">SEO Health</h2>
                    <p className="text-muted-foreground">Google Search Console visibility and indexing signals.</p>
                </div>
                <Card>
                    <CardContent className="py-8 text-center space-y-4">
                        <p className="text-sm text-destructive">{error}</p>
                        <Button onClick={() => loadReport()}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!report) return null;

    const status = statusMeta(report.status);
    const StatusIcon = status.icon;

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">SEO Health</h2>
                    <p className="text-muted-foreground">Indexing and traffic diagnostics powered by Search Console.</p>
                </div>
                <Button variant="outline" onClick={() => loadReport(true)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">System Status</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                        <div className={`h-4 w-4 rounded-full ${status.color}`} />
                        <div>
                            <div className="flex items-center gap-2">
                                <StatusIcon className="h-5 w-5" />
                                <span className="text-xl font-semibold">{status.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Index rate is {report.indexRate}%</p>
                            {metaState && (
                                <p className="text-xs text-muted-foreground">
                                    Updated {new Date(metaState.updatedAt).toLocaleString()} {metaState.cached ? '(cached)' : ''}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Index Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{report.indexRate}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {report.indexedCount} indexed of {report.sampleCount} sampled URLs
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                            Traffic (Last {metaState?.config?.trafficDays ?? 3} Days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Impressions</span>
                            <span className="font-semibold">{report.impressions.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Clicks</span>
                            <span className="font-semibold">{report.clicks.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {report.window.startDate} → {report.window.endDate}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Failed URLs (Sample)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {report.failedUrls.length === 0 ? (
                        <p className="text-sm text-muted-foreground">All sampled URLs are indexed.</p>
                    ) : (
                        <div className="space-y-2">
                            {report.failedUrls.map(item => (
                                <div key={item.url} className="rounded-lg border border-border p-3 text-sm">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                        <a href={item.url} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">
                                            {item.url}
                                        </a>
                                        <Badge variant="outline">{item.reason}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {report.warnings.length > 0 && (
                <Card className="border-yellow-500/40">
                    <CardHeader>
                        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Warnings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {report.warnings.map((warning, index) => (
                            <p key={`${warning}-${index}`} className="text-yellow-700">
                                {warning}
                            </p>
                        ))}
                    </CardContent>
                </Card>
            )}

            {metaState?.config && (
                <Card>
                    <CardHeader>
                        <CardTitle>Automation Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <label className="text-sm text-muted-foreground">
                                Sample size
                                <input
                                    type="number"
                                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                                    value={metaState.config.sampleSize}
                                    onChange={(e) => setMetaState(prev => prev ? ({
                                        ...prev,
                                        config: { ...prev.config, sampleSize: Number(e.target.value) }
                                    }) : prev)}
                                />
                            </label>
                            <label className="text-sm text-muted-foreground">
                                Inspection days
                                <input
                                    type="number"
                                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                                    value={metaState.config.inspectionDays}
                                    onChange={(e) => setMetaState(prev => prev ? ({
                                        ...prev,
                                        config: { ...prev.config, inspectionDays: Number(e.target.value) }
                                    }) : prev)}
                                />
                            </label>
                            <label className="text-sm text-muted-foreground">
                                Traffic window (days)
                                <input
                                    type="number"
                                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                                    value={metaState.config.trafficDays}
                                    onChange={(e) => setMetaState(prev => prev ? ({
                                        ...prev,
                                        config: { ...prev.config, trafficDays: Number(e.target.value) }
                                    }) : prev)}
                                />
                            </label>
                            <label className="text-sm text-muted-foreground">
                                Auto-refresh (hours)
                                <input
                                    type="number"
                                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                                    value={metaState.config.autoRefreshHours}
                                    onChange={(e) => setMetaState(prev => prev ? ({
                                        ...prev,
                                        config: { ...prev.config, autoRefreshHours: Number(e.target.value) }
                                    }) : prev)}
                                />
                            </label>
                            <label className="text-sm text-muted-foreground">
                                Inspection daily limit
                                <input
                                    type="number"
                                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                                    value={metaState.config.inspectionDailyLimit}
                                    onChange={(e) => setMetaState(prev => prev ? ({
                                        ...prev,
                                        config: { ...prev.config, inspectionDailyLimit: Number(e.target.value) }
                                    }) : prev)}
                                />
                            </label>
                            <label className="text-sm text-muted-foreground">
                                Inspection concurrency
                                <input
                                    type="number"
                                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                                    value={metaState.config.inspectionConcurrency}
                                    onChange={(e) => setMetaState(prev => prev ? ({
                                        ...prev,
                                        config: { ...prev.config, inspectionConcurrency: Number(e.target.value) }
                                    }) : prev)}
                                />
                            </label>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-4 text-sm">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={metaState.config.stopPublishingOnRed}
                                    onChange={(e) => setMetaState(prev => prev ? ({
                                        ...prev,
                                        config: { ...prev.config, stopPublishingOnRed: e.target.checked }
                                    }) : prev)}
                                />
                                Stop auto-publish when status is RED
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={metaState.config.pauseDraftsOnRed}
                                    onChange={(e) => setMetaState(prev => prev ? ({
                                        ...prev,
                                        config: { ...prev.config, pauseDraftsOnRed: e.target.checked }
                                    }) : prev)}
                                />
                                Pause draft generation when status is RED
                            </label>
                        </div>
                        <Button
                            onClick={async () => {
                                if (!metaState?.config) return;
                                setSaving(true);
                                try {
                                    const res = await fetch('/api/admin/seo-health/config', {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(metaState.config)
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                        setMetaState(prev => prev ? ({ ...prev, config: data.config }) : prev);
                                    }
                                } finally {
                                    setSaving(false);
                                }
                            }}
                            disabled={saving}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Save Controls
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

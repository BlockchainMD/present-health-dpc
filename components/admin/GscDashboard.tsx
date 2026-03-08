'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Eye, MousePointerClick, Target, ArrowUpDown, AlertTriangle } from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from 'recharts';

interface DashboardData {
    success: boolean;
    gscConfigured: boolean;
    days: number;
    totals: {
        impressions: number;
        clicks: number;
        ctr: number;
        avgPosition: number;
        deltas: {
            impressions: number;
            clicks: number;
            ctr: number;
            avgPosition: number;
        };
    };
    timeSeries: { date: string; impressions: number; clicks: number; avgPosition: number }[];
    topArticles: { slug: string; title: string; cluster: string; impressions: number; clicks: number; ctr: number; position: number }[];
    clusters: { cluster: string; impressions: number; clicks: number; ctr: number }[];
    lastSyncAt: string | null;
}

const PERIOD_OPTIONS = [7, 14, 30, 90] as const;

export default function GscDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [days, setDays] = useState<number>(30);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/metrics/gsc-dashboard?days=${days}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Failed to load');
            setData(json);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await fetch('/api/admin/metrics/gsc-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ days: 7 }),
            });
            await fetchData();
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
                <p className="text-destructive font-medium">{error}</p>
                <Button variant="outline" className="mt-4" onClick={fetchData}>Retry</Button>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Search Console</h1>
                    {data.lastSyncAt && (
                        <p className="text-sm text-muted-foreground mt-1">
                            Last sync: {new Date(data.lastSyncAt).toLocaleString()}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-border overflow-hidden">
                        {PERIOD_OPTIONS.map((p) => (
                            <button
                                key={p}
                                onClick={() => setDays(p)}
                                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                                    days === p
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-card text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                {p}d
                            </button>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                        {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        <span className="ml-1.5">Sync Now</span>
                    </Button>
                </div>
            </div>

            {/* Setup banner */}
            {!data.gscConfigured && (
                <div className="rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-800 dark:text-amber-200">GSC not configured</p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            Set <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">GSC_SITE_URL</code> and{' '}
                            <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">GSC_SERVICE_ACCOUNT_JSON</code>{' '}
                            as Cloud Run env vars. The service account needs &quot;Restricted&quot; or higher GSC permission.
                        </p>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    title="Impressions"
                    value={fmt(data.totals.impressions)}
                    delta={data.totals.deltas.impressions}
                    icon={<Eye className="h-4 w-4" />}
                />
                <KpiCard
                    title="Clicks"
                    value={fmt(data.totals.clicks)}
                    delta={data.totals.deltas.clicks}
                    icon={<MousePointerClick className="h-4 w-4" />}
                />
                <KpiCard
                    title="CTR"
                    value={`${(data.totals.ctr * 100).toFixed(1)}%`}
                    delta={data.totals.deltas.ctr}
                    icon={<Target className="h-4 w-4" />}
                />
                <KpiCard
                    title="Avg Position"
                    value={data.totals.avgPosition.toFixed(1)}
                    delta={data.totals.deltas.avgPosition}
                    icon={<ArrowUpDown className="h-4 w-4" />}
                />
            </div>

            {/* Traffic Trends */}
            {data.timeSeries.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Traffic Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={data.timeSeries}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(v: string) => {
                                        const d = new Date(v + 'T00:00:00');
                                        return `${d.getMonth() + 1}/${d.getDate()}`;
                                    }}
                                    className="text-xs"
                                />
                                <YAxis yAxisId="left" className="text-xs" />
                                <YAxis yAxisId="right" orientation="right" className="text-xs" />
                                <Tooltip
                                    contentStyle={{ fontSize: '0.75rem' }}
                                    labelFormatter={(v: string) => new Date(v + 'T00:00:00').toLocaleDateString()}
                                />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="impressions"
                                    stroke="hsl(210, 80%, 55%)"
                                    fill="hsl(210, 80%, 55%)"
                                    fillOpacity={0.1}
                                    name="Impressions"
                                />
                                <Area
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="clicks"
                                    stroke="hsl(150, 70%, 45%)"
                                    fill="hsl(150, 70%, 45%)"
                                    fillOpacity={0.1}
                                    name="Clicks"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Top Articles Table */}
            {data.topArticles.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Top Articles by Clicks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-muted-foreground">
                                        <th className="pb-2 pr-4 font-medium">Article</th>
                                        <th className="pb-2 pr-4 font-medium text-right">Impressions</th>
                                        <th className="pb-2 pr-4 font-medium text-right">Clicks</th>
                                        <th className="pb-2 pr-4 font-medium text-right">CTR</th>
                                        <th className="pb-2 font-medium text-right">Position</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.topArticles.map((a) => (
                                        <tr key={a.slug} className="border-b border-border/50 last:border-0">
                                            <td className="py-2 pr-4">
                                                <div className="max-w-xs truncate font-medium">{a.title}</div>
                                                <div className="text-xs text-muted-foreground">{a.cluster}</div>
                                            </td>
                                            <td className="py-2 pr-4 text-right tabular-nums">{fmt(a.impressions)}</td>
                                            <td className="py-2 pr-4 text-right tabular-nums">{fmt(a.clicks)}</td>
                                            <td className="py-2 pr-4 text-right tabular-nums">{(a.ctr * 100).toFixed(1)}%</td>
                                            <td className="py-2 text-right tabular-nums">{a.position.toFixed(1)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Cluster Breakdown */}
            {data.clusters.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Clicks by Cluster</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={Math.max(200, data.clusters.length * 36)}>
                            <BarChart data={data.clusters} layout="vertical" margin={{ left: 120 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                                <XAxis type="number" className="text-xs" />
                                <YAxis
                                    type="category"
                                    dataKey="cluster"
                                    width={110}
                                    className="text-xs"
                                    tick={{ fontSize: 11 }}
                                />
                                <Tooltip contentStyle={{ fontSize: '0.75rem' }} />
                                <Bar dataKey="clicks" fill="hsl(210, 80%, 55%)" radius={[0, 4, 4, 0]} name="Clicks" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Empty state */}
            {data.timeSeries.length === 0 && data.topArticles.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <p className="font-medium">No metric data yet</p>
                        <p className="text-sm mt-1">
                            {data.gscConfigured
                                ? 'Click "Sync Now" to pull data from Google Search Console.'
                                : 'Configure GSC env vars first, then sync.'}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function KpiCard({ title, value, delta, icon }: { title: string; value: string; delta: number; icon: React.ReactNode }) {
    const positive = delta >= 0;
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{title}</span>
                    <span className="text-muted-foreground">{icon}</span>
                </div>
                <div className="text-2xl font-bold tabular-nums">{value}</div>
                {delta !== 0 && (
                    <div className="flex items-center gap-1 mt-1">
                        {positive ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <Badge variant={positive ? 'default' : 'destructive'} className="text-[10px] px-1.5 py-0">
                            {positive ? '+' : ''}{(delta * 100).toFixed(1)}%
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">vs prev period</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function fmt(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString();
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    AlertCircle,
    ArrowDownRight,
    ArrowUpRight,
    CheckCircle2,
    ExternalLink,
    Loader2,
    Minus,
    RefreshCw,
    Trash2,
    Unplug,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type AggregateMetric = {
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
};

type DailyChartPoint = {
    date: string;
    impressions: number;
    clicks: number;
    previousImpressions?: number;
    previousClicks?: number;
};

type QueryMetric = {
    query: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
};

type PageMetric = {
    page: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
};

type PagePerformanceRow = {
    path: string;
    pageType: "static" | "state" | "article" | "physician";
    lastmod: string;
    freshnessDays: number;
    targetKeyword: string | null;
    targetKeywordPosition: number | null;
    impressions: number;
    clicks: number;
    ctr: number;
    avgPosition: number;
    previousAvgPosition: number;
    positionDrop: number;
    flagDecliningPosition: boolean;
    flagHighImpressionLowCtr: boolean;
    flagHighCtrLowImpression: boolean;
};

type BrandedDaily = {
    date: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
};

type RevenueMonthlyRow = {
    month: string;
    label: string;
    traffic: number;
    leads: number;
    enrollments: number;
    newMrr: number;
    mrr: number;
};

type EnrollmentPageRow = {
    path: string;
    enrollments: number;
    mrr: number;
};

type EnrollmentQueryRow = {
    query: string;
    enrollments: number;
    mrr: number;
};

type ContentPerformanceRow = {
    articleId: string;
    title: string;
    slug: string;
    path: string;
    category: string | null;
    updatedAt: string;
    freshnessDays: number;
    clicks: number;
    impressions: number;
    ctr: number;
    avgPosition: number;
    previousClicks: number;
    avgEngagementSec: number | null;
    leads: number;
    enrollments: number;
    decliningTraffic: boolean;
    dueRefresh: boolean;
    contentRoiScore: number;
};

type AiObservation = {
    id: string;
    query: string;
    dateSpotted: string;
    positionInOverview: number | null;
    screenshotUrl: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
};

type IntegrationConfig = {
    searchConsoleSiteUrl: string;
    ga4PropertyId: string;
    useGa4: boolean;
    useNativeFallback: boolean;
};

type IntegrationStatus = {
    connected: boolean;
    googleEmail: string | null;
    scopes: string;
    expiresAt: string | null;
    config: IntegrationConfig;
    siteOptions: Array<{ siteUrl: string; permissionLevel: string | null }>;
    trafficSource: "GA4" | "NATIVE";
};

type AnalyticsDashboard = {
    generatedAt: string;
    period: {
        from: string;
        to: string;
        days: number;
    };
    compare: {
        from: string;
        to: string;
    } | null;
    integration: IntegrationStatus;
    searchConsole: {
        totals: AggregateMetric;
        previousTotals: AggregateMetric;
        chartDaily: DailyChartPoint[];
        topQueries: QueryMetric[];
        topPages: PageMetric[];
        stateFilter: { name: string; code: string } | null;
    };
    pagePerformance: PagePerformanceRow[];
    brandedSearch: {
        totals: AggregateMetric;
        daily: BrandedDaily[];
        patterns: string[];
    };
    revenueCorrelation: {
        monthly: RevenueMonthlyRow[];
        topEnrollmentPages: EnrollmentPageRow[];
        topEnrollmentQueries: EnrollmentQueryRow[];
    };
    contentPerformance: {
        rankedArticles: ContentPerformanceRow[];
        dueRefresh: ContentPerformanceRow[];
    };
    aiVisibility: {
        totalObservations: number;
        growth: Array<{ month: string; label: string; count: number }>;
        latest: AiObservation[];
    };
};

type StateOption = {
    name: string;
    code: string;
    slug: string;
};

type DashboardResponse = {
    success: boolean;
    error?: string;
    dashboard: AnalyticsDashboard;
    stateOptions: StateOption[];
};

type AiResponse = {
    success: boolean;
    error?: string;
    observations: AiObservation[];
    total: number;
    page: number;
    pageSize: number;
};

type AiForm = {
    query: string;
    dateSpotted: string;
    positionInOverview: string;
    screenshotUrl: string;
    notes: string;
};

function toIsoDate(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function defaultDateRange() {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 29);
    return {
        from: toIsoDate(from),
        to: toIsoDate(to),
    };
}

function formatInteger(value: number | null | undefined) {
    if (!Number.isFinite(value as number)) return "0";
    return Number(value).toLocaleString();
}

function formatPercent(value: number | null | undefined, digits = 2) {
    if (!Number.isFinite(value as number)) return "0.00%";
    return `${(Number(value) * 100).toFixed(digits)}%`;
}

function formatPosition(value: number | null | undefined) {
    if (!Number.isFinite(value as number)) return "-";
    return Number(value).toFixed(2);
}

function formatCurrency(value: number | null | undefined) {
    if (!Number.isFinite(value as number)) return "$0";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(Number(value));
}

function formatDateLabel(value: string) {
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateTime(value: string | null | undefined) {
    if (!value) return "-";
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) return value;
    return parsed.toLocaleString();
}

function metricDelta(current: number, previous: number) {
    const delta = current - previous;
    if (!Number.isFinite(delta)) {
        return { delta: 0, ratio: 0, direction: "flat" as const };
    }

    const ratio = previous !== 0 ? delta / Math.abs(previous) : 0;
    if (delta > 0) return { delta, ratio, direction: "up" as const };
    if (delta < 0) return { delta, ratio, direction: "down" as const };
    return { delta: 0, ratio: 0, direction: "flat" as const };
}

function DeltaBadge({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
    const { delta, ratio, direction } = metricDelta(current, previous);

    const effectiveDirection = (() => {
        if (!invert) return direction;
        if (direction === "up") return "down";
        if (direction === "down") return "up";
        return "flat";
    })();

    const Icon = effectiveDirection === "up" ? ArrowUpRight : effectiveDirection === "down" ? ArrowDownRight : Minus;
    const classes =
        effectiveDirection === "up"
            ? "border-green-300 bg-green-50 text-green-700"
            : effectiveDirection === "down"
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-muted bg-muted/50 text-muted-foreground";

    return (
        <Badge variant="outline" className={`gap-1 ${classes}`}>
            <Icon className="h-3 w-3" />
            {Math.abs(delta).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            {Number.isFinite(ratio) && previous !== 0 ? ` (${(ratio * 100).toFixed(1)}%)` : ""}
        </Badge>
    );
}

function TinyBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    return (
        <div className="h-2 w-full rounded bg-muted/70 overflow-hidden">
            <div className={`${color} h-full`} style={{ width: `${pct}%` }} />
        </div>
    );
}

function parseOAuthNotice(status: string | null, reason: string | null) {
    if (!status) return null;
    if (status === "connected") {
        return {
            kind: "success" as const,
            message: "Google Search Console and GA4 access connected.",
        };
    }
    if (status === "error") {
        return {
            kind: "error" as const,
            message: `Google OAuth failed${reason ? `: ${reason}` : ""}.`,
        };
    }
    if (status === "unauthorized") {
        return {
            kind: "error" as const,
            message: "OAuth callback was blocked because the admin session was missing.",
        };
    }
    return null;
}

export function AnalyticsIntegrationDashboard() {
    const params = useSearchParams();
    const initialRange = useMemo(() => defaultDateRange(), []);

    const [fromDate, setFromDate] = useState(initialRange.from);
    const [toDate, setToDate] = useState(initialRange.to);
    const [stateFilter, setStateFilter] = useState("all");
    const [compare, setCompare] = useState(true);

    const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
    const [stateOptions, setStateOptions] = useState<StateOption[]>([]);

    const [config, setConfig] = useState<IntegrationConfig>({
        searchConsoleSiteUrl: "",
        ga4PropertyId: "",
        useGa4: false,
        useNativeFallback: true,
    });

    const [aiObservations, setAiObservations] = useState<AiObservation[]>([]);
    const [aiTotal, setAiTotal] = useState(0);
    const [aiQuery, setAiQuery] = useState("");

    const [aiForm, setAiForm] = useState<AiForm>({
        query: "",
        dateSpotted: toIsoDate(new Date()),
        positionInOverview: "",
        screenshotUrl: "",
        notes: "",
    });

    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);
    const [savingAi, setSavingAi] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [pageSearch, setPageSearch] = useState("");

    const oauthNotice = useMemo(
        () => parseOAuthNotice(params.get("oauth"), params.get("reason")),
        [params]
    );

    async function loadDashboard(refresh = false) {
        setLoading(true);
        setError(null);

        try {
            const query = new URLSearchParams();
            if (fromDate) query.set("from", fromDate);
            if (toDate) query.set("to", toDate);
            if (stateFilter && stateFilter !== "all") query.set("stateFilter", stateFilter);
            query.set("compare", compare ? "1" : "0");
            if (refresh) query.set("refresh", "1");

            const res = await fetch(`/api/admin/analytics/dashboard?${query.toString()}`, {
                cache: "no-store",
            });
            const data = (await res.json().catch(() => null)) as DashboardResponse | null;
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to load analytics dashboard");
            }

            setDashboard(data.dashboard);
            setStateOptions(Array.isArray(data.stateOptions) ? data.stateOptions : []);
            setConfig(data.dashboard.integration.config);
        } catch (err: any) {
            setError(err?.message || "Failed to load analytics dashboard");
            setDashboard(null);
        } finally {
            setLoading(false);
        }
    }

    async function loadAiObservations() {
        try {
            const query = new URLSearchParams();
            query.set("page", "1");
            query.set("pageSize", "200");
            if (aiQuery.trim()) query.set("q", aiQuery.trim());

            const res = await fetch(`/api/admin/analytics/ai-overview?${query.toString()}`, {
                cache: "no-store",
            });
            const data = (await res.json().catch(() => null)) as AiResponse | null;
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to load AI overview observations");
            }
            setAiObservations(Array.isArray(data.observations) ? data.observations : []);
            setAiTotal(Number.isFinite(data.total) ? data.total : 0);
        } catch (err: any) {
            setError(err?.message || "Failed to load AI overview observations");
        }
    }

    useEffect(() => {
        void loadDashboard(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        void loadAiObservations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aiQuery]);

    async function runSync() {
        setSyncing(true);
        setError(null);
        setNotice(null);

        try {
            const res = await fetch("/api/admin/analytics/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    from: fromDate,
                    to: toDate,
                    includeGa4: config.useGa4,
                }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to sync analytics data");
            }

            setNotice(`Analytics sync complete (${data?.result?.from || fromDate} to ${data?.result?.to || toDate}).`);
            await loadDashboard(false);
        } catch (err: any) {
            setError(err?.message || "Failed to sync analytics data");
        } finally {
            setSyncing(false);
        }
    }

    async function saveIntegrationConfig() {
        setSavingConfig(true);
        setError(null);
        setNotice(null);

        try {
            const res = await fetch("/api/admin/analytics/integration", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to save analytics integration config");
            }

            setNotice("Analytics integration settings saved.");
            await loadDashboard(false);
        } catch (err: any) {
            setError(err?.message || "Failed to save analytics integration config");
        } finally {
            setSavingConfig(false);
        }
    }

    async function disconnectGoogle() {
        setSavingConfig(true);
        setError(null);
        setNotice(null);

        try {
            const res = await fetch("/api/admin/analytics/oauth/disconnect", {
                method: "POST",
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to disconnect Google analytics integration");
            }

            setNotice("Google analytics integration disconnected.");
            await loadDashboard(false);
        } catch (err: any) {
            setError(err?.message || "Failed to disconnect Google analytics integration");
        } finally {
            setSavingConfig(false);
        }
    }

    async function createAiObservation() {
        if (!aiForm.query.trim()) {
            setError("AI visibility query is required.");
            return;
        }

        setSavingAi(true);
        setError(null);
        setNotice(null);

        try {
            const res = await fetch("/api/admin/analytics/ai-overview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: aiForm.query.trim(),
                    dateSpotted: aiForm.dateSpotted,
                    positionInOverview: aiForm.positionInOverview ? Number(aiForm.positionInOverview) : null,
                    screenshotUrl: aiForm.screenshotUrl.trim() || null,
                    notes: aiForm.notes.trim() || null,
                }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to create AI visibility observation");
            }

            setAiForm((current) => ({
                ...current,
                query: "",
                positionInOverview: "",
                screenshotUrl: "",
                notes: "",
            }));
            setNotice("AI visibility observation saved.");
            await Promise.all([loadAiObservations(), loadDashboard(false)]);
        } catch (err: any) {
            setError(err?.message || "Failed to create AI visibility observation");
        } finally {
            setSavingAi(false);
        }
    }

    async function deleteObservation(id: string) {
        setSavingAi(true);
        setError(null);
        setNotice(null);

        try {
            const res = await fetch(`/api/admin/analytics/ai-overview/${id}`, {
                method: "DELETE",
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to delete AI visibility observation");
            }
            setNotice("AI visibility observation deleted.");
            await Promise.all([loadAiObservations(), loadDashboard(false)]);
        } catch (err: any) {
            setError(err?.message || "Failed to delete AI visibility observation");
        } finally {
            setSavingAi(false);
        }
    }

    const filteredPagePerformance = useMemo(() => {
        const rows = dashboard?.pagePerformance || [];
        const q = pageSearch.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((row) => {
            return (
                row.path.toLowerCase().includes(q) ||
                String(row.targetKeyword || "").toLowerCase().includes(q)
            );
        });
    }, [dashboard?.pagePerformance, pageSearch]);

    const dailySlice = useMemo(() => {
        const points = dashboard?.searchConsole.chartDaily || [];
        return points.slice(-30);
    }, [dashboard?.searchConsole.chartDaily]);

    const maxDailyImpressions = useMemo(() => {
        return Math.max(1, ...dailySlice.map((point) => point.impressions));
    }, [dailySlice]);

    const maxDailyClicks = useMemo(() => {
        return Math.max(1, ...dailySlice.map((point) => point.clicks));
    }, [dailySlice]);

    const brandedDailySlice = useMemo(() => {
        const points = dashboard?.brandedSearch.daily || [];
        return points.slice(-30);
    }, [dashboard?.brandedSearch.daily]);

    const maxBrandedImpressions = useMemo(() => {
        return Math.max(1, ...brandedDailySlice.map((point) => point.impressions));
    }, [brandedDailySlice]);

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!dashboard) {
        return (
            <div className="max-w-6xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Analytics Integration Dashboard</h1>
                    <p className="text-muted-foreground">Search Console + traffic + conversion tracking.</p>
                </div>
                <Card>
                    <CardContent className="py-10 text-center space-y-4">
                        <p className="text-sm text-destructive">{error || "Analytics dashboard data is unavailable."}</p>
                        <Button onClick={() => void loadDashboard(false)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const currentTotals = dashboard.searchConsole.totals;
    const previousTotals = dashboard.searchConsole.previousTotals;

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Analytics Integration Dashboard</h1>
                    <p className="text-muted-foreground">
                        Search Console + traffic + lead conversion monitoring with cached daily sync.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => void loadDashboard(false)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button onClick={() => void runSync()} disabled={syncing}>
                        {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Sync Cache Now
                    </Button>
                </div>
            </div>

            {oauthNotice ? (
                <Card className={oauthNotice.kind === "success" ? "border-green-400" : "border-red-400"}>
                    <CardContent className="py-3 flex items-center gap-2 text-sm">
                        {oauthNotice.kind === "success" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        {oauthNotice.message}
                    </CardContent>
                </Card>
            ) : null}

            {error ? (
                <Card className="border-red-400">
                    <CardContent className="py-3 text-sm text-red-700">{error}</CardContent>
                </Card>
            ) : null}

            {notice ? (
                <Card className="border-green-400">
                    <CardContent className="py-3 text-sm text-green-700">{notice}</CardContent>
                </Card>
            ) : null}

            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>Date range, comparison, and query state filter.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-5">
                    <div className="space-y-2">
                        <Label htmlFor="analytics-from">From</Label>
                        <Input
                            id="analytics-from"
                            type="date"
                            value={fromDate}
                            onChange={(event) => setFromDate(event.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="analytics-to">To</Label>
                        <Input
                            id="analytics-to"
                            type="date"
                            value={toDate}
                            onChange={(event) => setToDate(event.target.value)}
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="analytics-state">State Filter (Query Contains)</Label>
                        <select
                            id="analytics-state"
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                            value={stateFilter}
                            onChange={(event) => setStateFilter(event.target.value)}
                        >
                            <option value="all">All states</option>
                            {stateOptions.map((state) => (
                                <option key={state.code} value={state.name}>
                                    {state.name} ({state.code})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="analytics-compare">Comparison</Label>
                        <label className="h-9 px-3 rounded-md border border-input bg-background flex items-center gap-2 text-sm">
                            <input
                                id="analytics-compare"
                                type="checkbox"
                                checked={compare}
                                onChange={(event) => setCompare(event.target.checked)}
                            />
                            Compare to previous window
                        </label>
                    </div>
                    <div className="md:col-span-5 flex gap-2">
                        <Button onClick={() => void loadDashboard(false)}>
                            Apply Filters
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                const range = defaultDateRange();
                                setFromDate(range.from);
                                setToDate(range.to);
                                setStateFilter("all");
                                setCompare(true);
                            }}
                        >
                            Reset
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Google Integration</CardTitle>
                    <CardDescription>
                        Connect OAuth to Search Console and GA4, then configure site URL/property ID.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge className={dashboard.integration.connected ? "bg-green-600" : "bg-muted text-foreground"}>
                            {dashboard.integration.connected ? "Connected" : "Not connected"}
                        </Badge>
                        <Badge variant="outline">Traffic Source: {dashboard.integration.trafficSource}</Badge>
                        {dashboard.integration.googleEmail ? (
                            <span className="text-sm text-muted-foreground">{dashboard.integration.googleEmail}</span>
                        ) : null}
                        {dashboard.integration.expiresAt ? (
                            <span className="text-xs text-muted-foreground">
                                Token expires: {formatDateTime(dashboard.integration.expiresAt)}
                            </span>
                        ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="analytics-site-url">Search Console Site URL</Label>
                            <Input
                                id="analytics-site-url"
                                value={config.searchConsoleSiteUrl}
                                onChange={(event) =>
                                    setConfig((current) => ({ ...current, searchConsoleSiteUrl: event.target.value }))
                                }
                                placeholder="https://presenthealthmd.com/"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="analytics-ga4-property">GA4 Property ID</Label>
                            <Input
                                id="analytics-ga4-property"
                                value={config.ga4PropertyId}
                                onChange={(event) =>
                                    setConfig((current) => ({ ...current, ga4PropertyId: event.target.value }))
                                }
                                placeholder="123456789"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <label className="text-sm inline-flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={config.useGa4}
                                onChange={(event) =>
                                    setConfig((current) => ({ ...current, useGa4: event.target.checked }))
                                }
                            />
                            Use GA4 API traffic
                        </label>
                        <label className="text-sm inline-flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={config.useNativeFallback}
                                onChange={(event) =>
                                    setConfig((current) => ({ ...current, useNativeFallback: event.target.checked }))
                                }
                            />
                            Use native traffic fallback
                        </label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button onClick={() => void saveIntegrationConfig()} disabled={savingConfig}>
                            {savingConfig ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Save Settings
                        </Button>
                        <Button asChild variant="outline">
                            <a href="/api/admin/analytics/oauth/connect">Connect Google OAuth</a>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => void disconnectGoogle()}
                            disabled={!dashboard.integration.connected || savingConfig}
                        >
                            <Unplug className="h-4 w-4 mr-2" />
                            Disconnect
                        </Button>
                        <Button asChild variant="outline">
                            <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer">
                                Search Console
                                <ExternalLink className="h-4 w-4 ml-2" />
                            </a>
                        </Button>
                    </div>

                    {dashboard.integration.siteOptions.length ? (
                        <div className="rounded-lg border p-3">
                            <div className="text-sm font-medium mb-2">Accessible Search Console properties</div>
                            <div className="space-y-1 text-sm">
                                {dashboard.integration.siteOptions.slice(0, 10).map((site) => (
                                    <div key={site.siteUrl} className="flex items-center justify-between gap-2">
                                        <span className="truncate">{site.siteUrl}</span>
                                        <Badge variant="outline">{site.permissionLevel || "unknown"}</Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Impressions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="text-3xl font-bold">{formatInteger(currentTotals.impressions)}</div>
                        <DeltaBadge current={currentTotals.impressions} previous={previousTotals.impressions} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Clicks</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="text-3xl font-bold">{formatInteger(currentTotals.clicks)}</div>
                        <DeltaBadge current={currentTotals.clicks} previous={previousTotals.clicks} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">CTR</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="text-3xl font-bold">{formatPercent(currentTotals.ctr)}</div>
                        <DeltaBadge current={currentTotals.ctr} previous={previousTotals.ctr} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Avg Position</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="text-3xl font-bold">{formatPosition(currentTotals.position)}</div>
                        <DeltaBadge current={currentTotals.position} previous={previousTotals.position} invert />
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Impressions and Clicks Over Time</CardTitle>
                    <CardDescription>
                        {dashboard.period.from} to {dashboard.period.to}
                        {dashboard.compare ? ` (vs ${dashboard.compare.from} to ${dashboard.compare.to})` : ""}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {dailySlice.length ? (
                        dailySlice.map((point) => (
                            <div key={point.date} className="grid gap-2 md:grid-cols-[88px_1fr_84px_1fr_84px] items-center text-xs">
                                <div className="font-medium">{formatDateLabel(point.date)}</div>
                                <TinyBar value={point.impressions} max={maxDailyImpressions} color="bg-sky-500" />
                                <div className="text-right text-muted-foreground">{formatInteger(point.impressions)}</div>
                                <TinyBar value={point.clicks} max={maxDailyClicks} color="bg-emerald-500" />
                                <div className="text-right text-muted-foreground">{formatInteger(point.clicks)}</div>
                            </div>
                        ))
                    ) : (
                        <div className="text-sm text-muted-foreground">No Search Console chart data in this window yet.</div>
                    )}
                </CardContent>
            </Card>

            <Tabs defaultValue="queries" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="queries">Top Queries</TabsTrigger>
                    <TabsTrigger value="pages">Top Pages</TabsTrigger>
                </TabsList>

                <TabsContent value="queries">
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Queries</CardTitle>
                            <CardDescription>
                                {dashboard.searchConsole.stateFilter
                                    ? `Filtered for queries containing ${dashboard.searchConsole.stateFilter.name.toUpperCase()}`
                                    : "Unfiltered query list"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/40 text-left">
                                        <tr>
                                            <th className="px-3 py-2">Query</th>
                                            <th className="px-3 py-2 text-right">Impressions</th>
                                            <th className="px-3 py-2 text-right">Clicks</th>
                                            <th className="px-3 py-2 text-right">CTR</th>
                                            <th className="px-3 py-2 text-right">Position</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboard.searchConsole.topQueries.slice(0, 30).map((row) => (
                                            <tr key={row.query} className="border-t align-top">
                                                <td className="px-3 py-2 max-w-[440px] truncate">{row.query}</td>
                                                <td className="px-3 py-2 text-right">{formatInteger(row.impressions)}</td>
                                                <td className="px-3 py-2 text-right">{formatInteger(row.clicks)}</td>
                                                <td className="px-3 py-2 text-right">{formatPercent(row.ctr)}</td>
                                                <td className="px-3 py-2 text-right">{formatPosition(row.position)}</td>
                                            </tr>
                                        ))}
                                        {!dashboard.searchConsole.topQueries.length ? (
                                            <tr>
                                                <td className="px-3 py-4 text-muted-foreground" colSpan={5}>
                                                    No query rows available.
                                                </td>
                                            </tr>
                                        ) : null}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pages">
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Pages</CardTitle>
                            <CardDescription>Best performing URLs by clicks and impressions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/40 text-left">
                                        <tr>
                                            <th className="px-3 py-2">Path</th>
                                            <th className="px-3 py-2 text-right">Impressions</th>
                                            <th className="px-3 py-2 text-right">Clicks</th>
                                            <th className="px-3 py-2 text-right">CTR</th>
                                            <th className="px-3 py-2 text-right">Position</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboard.searchConsole.topPages.slice(0, 30).map((row) => (
                                            <tr key={row.page} className="border-t align-top">
                                                <td className="px-3 py-2 max-w-[440px]">
                                                    <Link href={row.page} className="hover:underline text-primary">
                                                        {row.page}
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-2 text-right">{formatInteger(row.impressions)}</td>
                                                <td className="px-3 py-2 text-right">{formatInteger(row.clicks)}</td>
                                                <td className="px-3 py-2 text-right">{formatPercent(row.ctr)}</td>
                                                <td className="px-3 py-2 text-right">{formatPosition(row.position)}</td>
                                            </tr>
                                        ))}
                                        {!dashboard.searchConsole.topPages.length ? (
                                            <tr>
                                                <td className="px-3 py-4 text-muted-foreground" colSpan={5}>
                                                    No page rows available.
                                                </td>
                                            </tr>
                                        ) : null}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Card>
                <CardHeader>
                    <CardTitle>Page Performance Tracker</CardTitle>
                    <CardDescription>
                        Freshness, ranking movement, and CTR opportunity flags across all indexable pages.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            value={pageSearch}
                            onChange={(event) => setPageSearch(event.target.value)}
                            placeholder="Filter by path or target query"
                            className="max-w-md"
                        />
                        <Badge variant="outline">{filteredPagePerformance.length} pages</Badge>
                    </div>

                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-left">
                                <tr>
                                    <th className="px-3 py-2">Path</th>
                                    <th className="px-3 py-2">Target Keyword</th>
                                    <th className="px-3 py-2 text-right">Pos</th>
                                    <th className="px-3 py-2 text-right">Impr.</th>
                                    <th className="px-3 py-2 text-right">CTR</th>
                                    <th className="px-3 py-2 text-right">Freshness</th>
                                    <th className="px-3 py-2">Flags</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPagePerformance.slice(0, 200).map((row) => (
                                    <tr key={row.path} className="border-t align-top">
                                        <td className="px-3 py-2 max-w-[280px]">
                                            <Link href={row.path} className="hover:underline text-primary">
                                                {row.path}
                                            </Link>
                                            <div className="text-xs text-muted-foreground uppercase">{row.pageType}</div>
                                        </td>
                                        <td className="px-3 py-2 max-w-[240px] truncate">{row.targetKeyword || "-"}</td>
                                        <td className="px-3 py-2 text-right">{formatPosition(row.targetKeywordPosition)}</td>
                                        <td className="px-3 py-2 text-right">{formatInteger(row.impressions)}</td>
                                        <td className="px-3 py-2 text-right">{formatPercent(row.ctr)}</td>
                                        <td className="px-3 py-2 text-right">{row.freshnessDays}d</td>
                                        <td className="px-3 py-2">
                                            <div className="flex flex-wrap gap-1">
                                                {row.flagDecliningPosition ? (
                                                    <Badge className="bg-red-600">Dropped &gt;5</Badge>
                                                ) : null}
                                                {row.flagHighImpressionLowCtr ? (
                                                    <Badge className="bg-yellow-500 text-black">High Impr + Low CTR</Badge>
                                                ) : null}
                                                {row.flagHighCtrLowImpression ? (
                                                    <Badge variant="outline">High CTR + Low Impr</Badge>
                                                ) : null}
                                                {!row.flagDecliningPosition &&
                                                !row.flagHighImpressionLowCtr &&
                                                !row.flagHighCtrLowImpression ? (
                                                    <Badge variant="outline">Healthy</Badge>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!filteredPagePerformance.length ? (
                                    <tr>
                                        <td className="px-3 py-4 text-muted-foreground" colSpan={7}>
                                            No pages match your filter.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Branded Search Monitor</CardTitle>
                        <CardDescription>
                            Tracking query patterns: {dashboard.brandedSearch.patterns.join(", ")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border p-3">
                                <div className="text-xs text-muted-foreground">Branded Impressions</div>
                                <div className="text-xl font-semibold">{formatInteger(dashboard.brandedSearch.totals.impressions)}</div>
                            </div>
                            <div className="rounded-lg border p-3">
                                <div className="text-xs text-muted-foreground">Branded Clicks</div>
                                <div className="text-xl font-semibold">{formatInteger(dashboard.brandedSearch.totals.clicks)}</div>
                            </div>
                        </div>

                        {brandedDailySlice.length ? (
                            brandedDailySlice.map((point) => (
                                <div key={point.date} className="grid gap-2 md:grid-cols-[88px_1fr_84px] items-center text-xs">
                                    <div className="font-medium">{formatDateLabel(point.date)}</div>
                                    <TinyBar value={point.impressions} max={maxBrandedImpressions} color="bg-indigo-500" />
                                    <div className="text-right text-muted-foreground">{formatInteger(point.impressions)}</div>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-muted-foreground">No branded query rows in this window.</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>AI Visibility Growth</CardTitle>
                        <CardDescription>Manual log of AI Overview appearances.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="rounded-lg border p-3">
                            <div className="text-xs text-muted-foreground">Total Observations</div>
                            <div className="text-xl font-semibold">{formatInteger(dashboard.aiVisibility.totalObservations)}</div>
                        </div>

                        {dashboard.aiVisibility.growth.length ? (
                            dashboard.aiVisibility.growth.map((row) => {
                                const max = Math.max(
                                    1,
                                    ...dashboard.aiVisibility.growth.map((item) => item.count)
                                );
                                return (
                                    <div key={row.month} className="grid gap-2 md:grid-cols-[92px_1fr_70px] items-center text-xs">
                                        <div className="font-medium">{row.label}</div>
                                        <TinyBar value={row.count} max={max} color="bg-fuchsia-500" />
                                        <div className="text-right text-muted-foreground">{row.count}</div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-sm text-muted-foreground">No AI visibility observations logged yet.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Revenue Correlation</CardTitle>
                    <CardDescription>Traffic → leads → enrollments → MRR by month.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-left">
                                <tr>
                                    <th className="px-3 py-2">Month</th>
                                    <th className="px-3 py-2 text-right">Traffic</th>
                                    <th className="px-3 py-2 text-right">Leads</th>
                                    <th className="px-3 py-2 text-right">Enrollments</th>
                                    <th className="px-3 py-2 text-right">New MRR</th>
                                    <th className="px-3 py-2 text-right">Total MRR</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboard.revenueCorrelation.monthly.slice(-12).map((row) => (
                                    <tr key={row.month} className="border-t">
                                        <td className="px-3 py-2">{row.label}</td>
                                        <td className="px-3 py-2 text-right">{formatInteger(row.traffic)}</td>
                                        <td className="px-3 py-2 text-right">{formatInteger(row.leads)}</td>
                                        <td className="px-3 py-2 text-right">{formatInteger(row.enrollments)}</td>
                                        <td className="px-3 py-2 text-right">{formatCurrency(row.newMrr)}</td>
                                        <td className="px-3 py-2 text-right">{formatCurrency(row.mrr)}</td>
                                    </tr>
                                ))}
                                {!dashboard.revenueCorrelation.monthly.length ? (
                                    <tr>
                                        <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                                            No revenue correlation rows available.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                        <div className="rounded-lg border p-3">
                            <div className="text-sm font-medium mb-2">Top enrollment pages</div>
                            <div className="space-y-2 text-sm">
                                {dashboard.revenueCorrelation.topEnrollmentPages.slice(0, 8).map((row) => (
                                    <div key={row.path} className="flex items-center justify-between gap-2">
                                        <Link href={row.path} className="text-primary hover:underline truncate">
                                            {row.path}
                                        </Link>
                                        <span className="text-muted-foreground">
                                            {row.enrollments} ({formatCurrency(row.mrr)})
                                        </span>
                                    </div>
                                ))}
                                {!dashboard.revenueCorrelation.topEnrollmentPages.length ? (
                                    <div className="text-muted-foreground">No attributed enrollment pages yet.</div>
                                ) : null}
                            </div>
                        </div>

                        <div className="rounded-lg border p-3">
                            <div className="text-sm font-medium mb-2">Top enrollment queries</div>
                            <div className="space-y-2 text-sm">
                                {dashboard.revenueCorrelation.topEnrollmentQueries.slice(0, 8).map((row) => (
                                    <div key={row.query} className="flex items-center justify-between gap-2">
                                        <span className="truncate">{row.query}</span>
                                        <span className="text-muted-foreground">
                                            {row.enrollments} ({formatCurrency(row.mrr)})
                                        </span>
                                    </div>
                                ))}
                                {!dashboard.revenueCorrelation.topEnrollmentQueries.length ? (
                                    <div className="text-muted-foreground">No attributed enrollment queries yet.</div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Content Performance Ranking</CardTitle>
                    <CardDescription>
                        Article traffic, engagement, leads, and freshness scoring.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Top ranked: {dashboard.contentPerformance.rankedArticles.length}</Badge>
                        <Badge className={dashboard.contentPerformance.dueRefresh.length ? "bg-yellow-500 text-black" : "bg-muted text-foreground"}>
                            Due for refresh: {dashboard.contentPerformance.dueRefresh.length}
                        </Badge>
                    </div>
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-left">
                                <tr>
                                    <th className="px-3 py-2">Article</th>
                                    <th className="px-3 py-2 text-right">Clicks</th>
                                    <th className="px-3 py-2 text-right">Impr.</th>
                                    <th className="px-3 py-2 text-right">CTR</th>
                                    <th className="px-3 py-2 text-right">Avg Eng.</th>
                                    <th className="px-3 py-2 text-right">Leads</th>
                                    <th className="px-3 py-2 text-right">ROI Score</th>
                                    <th className="px-3 py-2">Flags</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboard.contentPerformance.rankedArticles.slice(0, 40).map((row) => (
                                    <tr key={row.articleId} className="border-t align-top">
                                        <td className="px-3 py-2 max-w-[260px]">
                                            <Link href={row.path} className="text-primary hover:underline">
                                                {row.title}
                                            </Link>
                                            <div className="text-xs text-muted-foreground">{row.category || "Uncategorized"}</div>
                                        </td>
                                        <td className="px-3 py-2 text-right">{formatInteger(row.clicks)}</td>
                                        <td className="px-3 py-2 text-right">{formatInteger(row.impressions)}</td>
                                        <td className="px-3 py-2 text-right">{formatPercent(row.ctr)}</td>
                                        <td className="px-3 py-2 text-right">
                                            {row.avgEngagementSec ? `${row.avgEngagementSec.toFixed(1)}s` : "-"}
                                        </td>
                                        <td className="px-3 py-2 text-right">{formatInteger(row.leads)}</td>
                                        <td className="px-3 py-2 text-right">{row.contentRoiScore.toFixed(3)}</td>
                                        <td className="px-3 py-2">
                                            <div className="flex flex-wrap gap-1">
                                                {row.decliningTraffic ? (
                                                    <Badge className="bg-yellow-500 text-black">Traffic Down</Badge>
                                                ) : null}
                                                {row.dueRefresh ? (
                                                    <Badge className="bg-red-600">Refresh</Badge>
                                                ) : null}
                                                {!row.decliningTraffic && !row.dueRefresh ? (
                                                    <Badge variant="outline">Stable</Badge>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!dashboard.contentPerformance.rankedArticles.length ? (
                                    <tr>
                                        <td className="px-3 py-4 text-muted-foreground" colSpan={8}>
                                            No published article performance rows available.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>AI Visibility Log</CardTitle>
                    <CardDescription>
                        Manual tracking for AI Overview appearances. No API exists yet, so log observations here.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="ai-query">Query</Label>
                            <Input
                                id="ai-query"
                                value={aiForm.query}
                                onChange={(event) => setAiForm((current) => ({ ...current, query: event.target.value }))}
                                placeholder="best telehealth dpc in texas"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ai-date">Date Spotted</Label>
                            <Input
                                id="ai-date"
                                type="date"
                                value={aiForm.dateSpotted}
                                onChange={(event) => setAiForm((current) => ({ ...current, dateSpotted: event.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ai-position">Position In AI Overview</Label>
                            <Input
                                id="ai-position"
                                type="number"
                                min={1}
                                max={100}
                                value={aiForm.positionInOverview}
                                onChange={(event) =>
                                    setAiForm((current) => ({ ...current, positionInOverview: event.target.value }))
                                }
                                placeholder="1"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ai-screenshot">Screenshot URL</Label>
                            <Input
                                id="ai-screenshot"
                                value={aiForm.screenshotUrl}
                                onChange={(event) => setAiForm((current) => ({ ...current, screenshotUrl: event.target.value }))}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <Label htmlFor="ai-notes">Notes</Label>
                            <Textarea
                                id="ai-notes"
                                value={aiForm.notes}
                                onChange={(event) => setAiForm((current) => ({ ...current, notes: event.target.value }))}
                                placeholder="Context, variant tested, screenshot metadata"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button onClick={() => void createAiObservation()} disabled={savingAi}>
                            {savingAi ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Save Observation
                        </Button>
                        <Input
                            value={aiQuery}
                            onChange={(event) => setAiQuery(event.target.value)}
                            placeholder="Search logged observations"
                            className="max-w-sm"
                        />
                        <Badge variant="outline">{formatInteger(aiTotal)} logged</Badge>
                    </div>

                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-left">
                                <tr>
                                    <th className="px-3 py-2">Date</th>
                                    <th className="px-3 py-2">Query</th>
                                    <th className="px-3 py-2 text-right">Pos</th>
                                    <th className="px-3 py-2">Screenshot</th>
                                    <th className="px-3 py-2">Notes</th>
                                    <th className="px-3 py-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {aiObservations.map((row) => (
                                    <tr key={row.id} className="border-t align-top">
                                        <td className="px-3 py-2 whitespace-nowrap">{formatDateLabel(row.dateSpotted)}</td>
                                        <td className="px-3 py-2 max-w-[220px]">{row.query}</td>
                                        <td className="px-3 py-2 text-right">{row.positionInOverview || "-"}</td>
                                        <td className="px-3 py-2 max-w-[220px]">
                                            {row.screenshotUrl ? (
                                                <a
                                                    href={row.screenshotUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-primary hover:underline inline-flex items-center gap-1"
                                                >
                                                    Open
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 max-w-[280px] text-muted-foreground">
                                            {row.notes || "-"}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => void deleteObservation(row.id)}
                                                disabled={savingAi}
                                            >
                                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                                Delete
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {!aiObservations.length ? (
                                    <tr>
                                        <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                                            No AI visibility observations found.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Automation Notes</CardTitle>
                    <CardDescription>
                        Use Cloud Scheduler to call the sync endpoint daily during low-traffic hours.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div>
                        Sync endpoint: <code>/api/admin/analytics/sync</code> with <code>x-analytics-secret</code>
                        matching <code>ANALYTICS_SYNC_SECRET</code>.
                    </div>
                    <div>
                        Optional fallback secrets: <code>CONTENT_ENGINE_CRON_SECRET</code> or
                        <code> CONTENT_ENGINE_METRICS_SECRET</code>.
                    </div>
                    <div>
                        Native pageview tracking is active on public pages via <code>/api/analytics/track</code>.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    ExternalLink,
    Loader2,
    RefreshCw,
    WandSparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const WORKFLOW_OPTIONS = [
    { value: "NEEDS_REFRESH", label: "Needs Refresh" },
    { value: "REFRESH_IN_PROGRESS", label: "Refresh In Progress" },
    { value: "REFRESHED", label: "Refreshed" },
] as const;

type WorkflowStatus = (typeof WORKFLOW_OPTIONS)[number]["value"];

type Classification = "URGENT" | "MONITOR" | "HEALTHY";

type CalendarEvent = {
    type: "scheduled" | "overdue" | "refreshed";
    articleId: string;
    title: string;
    slug: string | null;
    date: string;
    refreshStatus: WorkflowStatus;
};

type Row = {
    articleId: string;
    title: string;
    slug: string | null;
    path: string;
    status: string;
    category: string | null;
    refreshStatus: WorkflowStatus;
    refreshRequested: boolean;
    refreshStatusUpdatedAt: string;
    nextRefreshDueAt: string | null;
    lastRefreshedAt: string | null;
    lastUpdatedAt: string;
    freshnessDays: number;
    stale90: boolean;
    stale180: boolean;
    timeSensitive: boolean;
    timeSensitiveReasons: string[];
    decay: {
        classification: Classification;
        declineCount: number;
        clickDeclining: boolean;
        impressionsDeclining: boolean;
        positionDeclining: boolean;
        currentClicks: number;
        previousClicks: number;
        currentImpressions: number;
        previousImpressions: number;
        currentAvgPosition: number;
        previousAvgPosition: number;
        clicksDeltaPct: number;
        impressionsDeltaPct: number;
        avgPositionDelta: number;
        periodCurrentStart: string;
        periodCurrentEnd: string;
        periodPreviousStart: string;
        periodPreviousEnd: string;
        snapshotCreatedAt: string;
        queryOpportunities: Array<{
            query: string;
            impressions: number;
            clicks: number;
            avgPosition: number;
            ctr: number;
        }>;
    } | null;
    latestBrief: {
        id: string;
        status: string;
        createdAt: string;
        provider: string | null;
        model: string | null;
    } | null;
};

type DashboardPayload = {
    generatedAt: string;
    lastDetectionAt: string | null;
    staleDetectionDays: number | null;
    autoDetectionRan: boolean;
    totals: {
        total: number;
        urgent: number;
        monitor: number;
        healthy: number;
        needsRefresh: number;
        inProgress: number;
        refreshed: number;
        stale90: number;
        stale180: number;
        timeSensitive: number;
        overdue: number;
        recentlyRefreshed: number;
    };
    rows: Row[];
    calendarEvents: CalendarEvent[];
    cadenceGuidance: Array<{ pageType: string; cadence: string; rationale: string }>;
};

function formatInteger(value: number) {
    if (!Number.isFinite(value)) return "0";
    return value.toLocaleString();
}

function formatPercent(value: number) {
    if (!Number.isFinite(value)) return "0.0%";
    return `${(value * 100).toFixed(1)}%`;
}

function formatDate(value: string | null | undefined) {
    if (!value) return "-";
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) return value;
    return parsed.toLocaleDateString();
}

function toInputDate(value: string | null | undefined) {
    if (!value) return "";
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) return "";
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function classificationBadge(value: Classification | null | undefined) {
    if (value === "URGENT") return <Badge className="bg-red-600">Urgent Refresh</Badge>;
    if (value === "MONITOR") return <Badge className="bg-yellow-500 text-black">Monitor</Badge>;
    return <Badge className="bg-emerald-600">Healthy</Badge>;
}

function freshnessBadge(row: Row) {
    if (row.stale180) return <Badge className="bg-red-600">{row.freshnessDays}d stale</Badge>;
    if (row.stale90) return <Badge className="bg-yellow-500 text-black">{row.freshnessDays}d stale</Badge>;
    return <Badge variant="outline">{row.freshnessDays}d</Badge>;
}

function workflowBadge(status: WorkflowStatus) {
    if (status === "NEEDS_REFRESH") return <Badge className="bg-red-600">Needs refresh</Badge>;
    if (status === "REFRESH_IN_PROGRESS") return <Badge className="bg-blue-600">In progress</Badge>;
    return <Badge className="bg-emerald-600">Refreshed</Badge>;
}

function monthGrid(reference = new Date()) {
    const first = new Date(reference.getFullYear(), reference.getMonth(), 1);
    const last = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);

    const startDay = first.getDay();
    const daysInMonth = last.getDate();

    const cells: Array<{ date: Date | null }> = [];

    for (let i = 0; i < startDay; i += 1) cells.push({ date: null });
    for (let d = 1; d <= daysInMonth; d += 1) {
        cells.push({ date: new Date(reference.getFullYear(), reference.getMonth(), d) });
    }

    while (cells.length % 7 !== 0) cells.push({ date: null });

    return {
        monthLabel: first.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        cells,
    };
}

function isoDateLocal(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export function ContentRefreshManager() {
    const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const [classificationFilter, setClassificationFilter] = useState<"ALL" | Classification>("ALL");
    const [workflowFilter, setWorkflowFilter] = useState<"ALL" | WorkflowStatus>("ALL");
    const [textFilter, setTextFilter] = useState("");

    const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});
    const [workflowDraft, setWorkflowDraft] = useState<Record<string, WorkflowStatus>>({});
    const [dueDateDraft, setDueDateDraft] = useState<Record<string, string>>({});

    async function loadDashboard(autoDetectIfStale = true) {
        setLoading(true);
        setError(null);

        try {
            const query = new URLSearchParams({ autoDetectIfStale: autoDetectIfStale ? "1" : "0" });
            const res = await fetch(`/api/admin/content-refresh/dashboard?${query.toString()}`, {
                cache: "no-store",
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to load content refresh dashboard");
            }

            setDashboard(data.dashboard as DashboardPayload);
        } catch (err: any) {
            setError(err?.message || "Failed to load content refresh dashboard");
            setDashboard(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadDashboard(true);
    }, []);

    const filteredRows = useMemo(() => {
        const rows = dashboard?.rows || [];
        const text = textFilter.trim().toLowerCase();

        return rows.filter((row) => {
            const classification = row.decay?.classification || "HEALTHY";
            if (classificationFilter !== "ALL" && classification !== classificationFilter) return false;
            if (workflowFilter !== "ALL" && row.refreshStatus !== workflowFilter) return false;
            if (!text) return true;
            return (
                row.title.toLowerCase().includes(text) ||
                (row.slug || "").toLowerCase().includes(text) ||
                (row.category || "").toLowerCase().includes(text)
            );
        });
    }, [dashboard?.rows, classificationFilter, workflowFilter, textFilter]);

    const calendarMap = useMemo(() => {
        const map = new Map<string, { scheduled: number; overdue: number; refreshed: number }>();

        for (const event of dashboard?.calendarEvents || []) {
            const key = event.date;
            const row = map.get(key) || { scheduled: 0, overdue: 0, refreshed: 0 };
            if (event.type === "scheduled") row.scheduled += 1;
            if (event.type === "overdue") row.overdue += 1;
            if (event.type === "refreshed") row.refreshed += 1;
            map.set(key, row);
        }

        return map;
    }, [dashboard?.calendarEvents]);

    const calendar = useMemo(() => monthGrid(new Date()), []);

    const overdueEvents = useMemo(
        () => (dashboard?.calendarEvents || []).filter((item) => item.type === "overdue").slice(0, 12),
        [dashboard?.calendarEvents]
    );

    const scheduledEvents = useMemo(
        () => (dashboard?.calendarEvents || []).filter((item) => item.type === "scheduled").slice(0, 12),
        [dashboard?.calendarEvents]
    );

    const refreshedEvents = useMemo(
        () => (dashboard?.calendarEvents || []).filter((item) => item.type === "refreshed").slice(0, 12),
        [dashboard?.calendarEvents]
    );

    async function runDetection() {
        setSyncing(true);
        setError(null);
        setNotice(null);

        try {
            const res = await fetch("/api/admin/content-refresh/detect", {
                method: "POST",
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to run refresh detection");
            }

            setNotice("Content decay detection completed.");
            await loadDashboard(false);
        } catch (err: any) {
            setError(err?.message || "Failed to run refresh detection");
        } finally {
            setSyncing(false);
        }
    }

    async function saveRow(articleId: string) {
        const status = workflowDraft[articleId];
        const dueDate = dueDateDraft[articleId];

        setRowBusy((prev) => ({ ...prev, [articleId]: true }));
        setError(null);
        setNotice(null);

        try {
            const payload: Record<string, unknown> = {};
            if (status) payload.status = status;
            if (dueDate !== undefined) payload.nextRefreshDueAt = dueDate || null;

            const res = await fetch(`/api/admin/content-refresh/article/${articleId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to update article refresh workflow");
            }

            setNotice("Refresh workflow updated.");
            await loadDashboard(false);
        } catch (err: any) {
            setError(err?.message || "Failed to update article refresh workflow");
        } finally {
            setRowBusy((prev) => ({ ...prev, [articleId]: false }));
        }
    }

    async function generateBrief(articleId: string) {
        setRowBusy((prev) => ({ ...prev, [articleId]: true }));
        setError(null);
        setNotice(null);

        try {
            const res = await fetch(`/api/admin/content-refresh/article/${articleId}/brief`, {
                method: "POST",
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to generate refresh brief");
            }

            setNotice("Refresh brief generated.");
            await loadDashboard(false);
        } catch (err: any) {
            setError(err?.message || "Failed to generate refresh brief");
        } finally {
            setRowBusy((prev) => ({ ...prev, [articleId]: false }));
        }
    }

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
                    <h1 className="text-3xl font-bold tracking-tight">Content Refresh Manager</h1>
                    <p className="text-sm text-muted-foreground">Detect ranking decay and coordinate refreshes.</p>
                </div>
                <Card>
                    <CardContent className="py-8 space-y-4 text-center">
                        <p className="text-sm text-destructive">{error || "Dashboard unavailable."}</p>
                        <Button onClick={() => void loadDashboard(true)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Content Refresh Manager</h1>
                    <p className="text-sm text-muted-foreground">
                        Weekly decay detection for published learn content using Search Console trends.
                    </p>
                    <div className="text-xs text-muted-foreground mt-1">
                        Last detection: {formatDate(dashboard.lastDetectionAt)}
                        {dashboard.autoDetectionRan ? " (auto-run from stale cache)" : ""}
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => void loadDashboard(false)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button onClick={() => void runDetection()} disabled={syncing}>
                        {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Run Decay Detection
                    </Button>
                </div>
            </div>

            {error ? (
                <Card className="border-red-400">
                    <CardContent className="py-3 text-sm text-red-700">{error}</CardContent>
                </Card>
            ) : null}

            {notice ? (
                <Card className="border-emerald-400">
                    <CardContent className="py-3 text-sm text-emerald-700">{notice}</CardContent>
                </Card>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Decay Detection</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                        <div className="flex justify-between"><span>Urgent</span><strong>{dashboard.totals.urgent}</strong></div>
                        <div className="flex justify-between"><span>Monitor</span><strong>{dashboard.totals.monitor}</strong></div>
                        <div className="flex justify-between"><span>Healthy</span><strong>{dashboard.totals.healthy}</strong></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Workflow</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                        <div className="flex justify-between"><span>Needs refresh</span><strong>{dashboard.totals.needsRefresh}</strong></div>
                        <div className="flex justify-between"><span>In progress</span><strong>{dashboard.totals.inProgress}</strong></div>
                        <div className="flex justify-between"><span>Refreshed</span><strong>{dashboard.totals.refreshed}</strong></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Freshness</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                        <div className="flex justify-between"><span>&gt; 90 days</span><strong>{dashboard.totals.stale90}</strong></div>
                        <div className="flex justify-between"><span>&gt; 180 days</span><strong>{dashboard.totals.stale180}</strong></div>
                        <div className="flex justify-between"><span>Time-sensitive</span><strong>{dashboard.totals.timeSensitive}</strong></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Calendar</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                        <div className="flex justify-between"><span>Scheduled</span><strong>{scheduledEvents.length}</strong></div>
                        <div className="flex justify-between"><span>Overdue</span><strong>{dashboard.totals.overdue}</strong></div>
                        <div className="flex justify-between"><span>Recent refreshes</span><strong>{dashboard.totals.recentlyRefreshed}</strong></div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>Filter by decay classification, workflow status, or text.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                        <Label htmlFor="classificationFilter">Classification</Label>
                        <select
                            id="classificationFilter"
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                            value={classificationFilter}
                            onChange={(event) => setClassificationFilter(event.target.value as any)}
                        >
                            <option value="ALL">All</option>
                            <option value="URGENT">Urgent</option>
                            <option value="MONITOR">Monitor</option>
                            <option value="HEALTHY">Healthy</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="workflowFilter">Workflow</Label>
                        <select
                            id="workflowFilter"
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                            value={workflowFilter}
                            onChange={(event) => setWorkflowFilter(event.target.value as any)}
                        >
                            <option value="ALL">All</option>
                            {WORKFLOW_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="textFilter">Search</Label>
                        <Input
                            id="textFilter"
                            value={textFilter}
                            onChange={(event) => setTextFilter(event.target.value)}
                            placeholder="Title, slug, category"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Articles Requiring Attention</CardTitle>
                    <CardDescription>
                        Thresholds: position drop &gt;3, clicks drop &gt;20%, impressions drop &gt;30%.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">{filteredRows.length} rows</div>
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-left">
                                <tr>
                                    <th className="px-3 py-2">Article</th>
                                    <th className="px-3 py-2">Decay</th>
                                    <th className="px-3 py-2">Freshness</th>
                                    <th className="px-3 py-2">Workflow</th>
                                    <th className="px-3 py-2">Schedule</th>
                                    <th className="px-3 py-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.map((row) => {
                                    const busy = Boolean(rowBusy[row.articleId]);
                                    const selectedWorkflow = workflowDraft[row.articleId] || row.refreshStatus;
                                    const selectedDueDate =
                                        dueDateDraft[row.articleId] !== undefined
                                            ? dueDateDraft[row.articleId]
                                            : toInputDate(row.nextRefreshDueAt);

                                    return (
                                        <tr key={row.articleId} className="border-t align-top">
                                            <td className="px-3 py-2 min-w-[260px]">
                                                <div className="font-medium text-foreground">{row.title}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {row.slug ? `/learn/${row.slug}` : row.path}
                                                </div>
                                                <div className="text-xs text-muted-foreground">Updated: {formatDate(row.lastUpdatedAt)}</div>
                                                {row.timeSensitive ? (
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        <Badge variant="outline">Time-sensitive</Badge>
                                                        {row.timeSensitiveReasons.slice(0, 2).map((reason) => (
                                                            <Badge key={`${row.articleId}-${reason}`} variant="outline" className="text-[10px]">
                                                                {reason}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td className="px-3 py-2 min-w-[240px] space-y-1">
                                                <div>{classificationBadge(row.decay?.classification)}</div>
                                                {row.decay ? (
                                                    <div className="text-xs text-muted-foreground space-y-1">
                                                        <div>
                                                            Clicks: {formatInteger(row.decay.currentClicks)} vs {formatInteger(row.decay.previousClicks)} (
                                                            {formatPercent(row.decay.clicksDeltaPct)})
                                                        </div>
                                                        <div>
                                                            Impr: {formatInteger(row.decay.currentImpressions)} vs {formatInteger(row.decay.previousImpressions)} (
                                                            {formatPercent(row.decay.impressionsDeltaPct)})
                                                        </div>
                                                        <div>
                                                            Position: {row.decay.currentAvgPosition.toFixed(2)} vs {row.decay.previousAvgPosition.toFixed(2)} (
                                                            +{row.decay.avgPositionDelta.toFixed(2)})
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-muted-foreground">No snapshot yet</div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 min-w-[160px] space-y-1">
                                                <div>{freshnessBadge(row)}</div>
                                                <div className="text-xs text-muted-foreground">Last refreshed: {formatDate(row.lastRefreshedAt)}</div>
                                                {row.latestBrief ? (
                                                    <div className="text-xs text-muted-foreground">
                                                        Brief: {formatDate(row.latestBrief.createdAt)}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-muted-foreground">No refresh brief</div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 min-w-[180px] space-y-2">
                                                <div>{workflowBadge(row.refreshStatus)}</div>
                                                <select
                                                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                                                    value={selectedWorkflow}
                                                    onChange={(event) =>
                                                        setWorkflowDraft((prev) => ({
                                                            ...prev,
                                                            [row.articleId]: event.target.value as WorkflowStatus,
                                                        }))
                                                    }
                                                >
                                                    {WORKFLOW_OPTIONS.map((option) => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2 min-w-[180px] space-y-2">
                                                <Input
                                                    type="date"
                                                    value={selectedDueDate}
                                                    onChange={(event) =>
                                                        setDueDateDraft((prev) => ({
                                                            ...prev,
                                                            [row.articleId]: event.target.value,
                                                        }))
                                                    }
                                                />
                                                <div className="text-xs text-muted-foreground">
                                                    Current due: {formatDate(row.nextRefreshDueAt)}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 min-w-[220px] text-right space-y-2">
                                                <div className="flex gap-2 justify-end">
                                                    <Button size="sm" variant="outline" asChild>
                                                        <Link href={`/admin/learn/${row.articleId}`}>
                                                            Edit
                                                        </Link>
                                                    </Button>
                                                    <Button size="sm" variant="outline" asChild>
                                                        <Link href={row.path} target="_blank">
                                                            Live
                                                            <ExternalLink className="h-3.5 w-3.5 ml-1" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                                <div className="flex gap-2 justify-end">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => void generateBrief(row.articleId)}
                                                        disabled={busy}
                                                    >
                                                        {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <WandSparkles className="h-3.5 w-3.5 mr-1" />}
                                                        Generate Brief
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => void saveRow(row.articleId)}
                                                        disabled={busy}
                                                    >
                                                        {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                                                        Save
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {!filteredRows.length ? (
                                    <tr>
                                        <td className="px-3 py-6 text-muted-foreground" colSpan={6}>
                                            No articles match the current filters.
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
                        <CardTitle className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5" />
                            Refresh Calendar ({calendar.monthLabel})
                        </CardTitle>
                        <CardDescription>Scheduled, overdue, and recently refreshed events.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-7 gap-2 text-xs mb-2 text-muted-foreground">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
                                <div key={label} className="font-medium text-center">{label}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-2 text-xs">
                            {calendar.cells.map((cell, index) => {
                                if (!cell.date) {
                                    return <div key={`empty-${index}`} className="h-20 rounded-md border border-dashed border-border/50" />;
                                }

                                const key = isoDateLocal(cell.date);
                                const counts = calendarMap.get(key) || { scheduled: 0, overdue: 0, refreshed: 0 };

                                return (
                                    <div key={key} className="h-20 rounded-md border border-border p-2 space-y-1">
                                        <div className="font-medium">{cell.date.getDate()}</div>
                                        {counts.overdue > 0 ? (
                                            <div className="rounded px-1 bg-red-100 text-red-700">Overdue {counts.overdue}</div>
                                        ) : null}
                                        {counts.scheduled > 0 ? (
                                            <div className="rounded px-1 bg-blue-100 text-blue-700">Scheduled {counts.scheduled}</div>
                                        ) : null}
                                        {counts.refreshed > 0 ? (
                                            <div className="rounded px-1 bg-emerald-100 text-emerald-700">Refreshed {counts.refreshed}</div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Calendar Queues</CardTitle>
                        <CardDescription>Prioritize overdue items first.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div>
                            <div className="font-medium text-red-700 flex items-center gap-1">
                                <AlertTriangle className="h-4 w-4" />
                                Overdue refreshes
                            </div>
                            <div className="mt-2 space-y-2">
                                {overdueEvents.length ? overdueEvents.map((event) => (
                                    <div key={`overdue-${event.articleId}-${event.date}`} className="flex justify-between gap-2">
                                        <Link href={`/admin/learn/${event.articleId}`} className="hover:underline text-primary">
                                            {event.title}
                                        </Link>
                                        <span className="text-muted-foreground">{event.date}</span>
                                    </div>
                                )) : <div className="text-muted-foreground">No overdue items.</div>}
                            </div>
                        </div>

                        <div>
                            <div className="font-medium text-blue-700">Scheduled refreshes</div>
                            <div className="mt-2 space-y-2">
                                {scheduledEvents.length ? scheduledEvents.map((event) => (
                                    <div key={`scheduled-${event.articleId}-${event.date}`} className="flex justify-between gap-2">
                                        <Link href={`/admin/learn/${event.articleId}`} className="hover:underline text-primary">
                                            {event.title}
                                        </Link>
                                        <span className="text-muted-foreground">{event.date}</span>
                                    </div>
                                )) : <div className="text-muted-foreground">No scheduled items.</div>}
                            </div>
                        </div>

                        <div>
                            <div className="font-medium text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4" />
                                Recently refreshed
                            </div>
                            <div className="mt-2 space-y-2">
                                {refreshedEvents.length ? refreshedEvents.map((event) => (
                                    <div key={`refreshed-${event.articleId}-${event.date}`} className="flex justify-between gap-2">
                                        <Link href={`/admin/learn/${event.articleId}`} className="hover:underline text-primary">
                                            {event.title}
                                        </Link>
                                        <span className="text-muted-foreground">{event.date}</span>
                                    </div>
                                )) : <div className="text-muted-foreground">No recent refresh completions.</div>}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Suggested Refresh Cadence</CardTitle>
                    <CardDescription>Baseline planning guidance for recurring refresh work.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    {dashboard.cadenceGuidance.map((item) => (
                        <div key={item.pageType} className="rounded-lg border border-border p-3">
                            <div className="font-medium text-foreground">{item.pageType}</div>
                            <div className="text-muted-foreground">Cadence: {item.cadence}</div>
                            <div className="text-muted-foreground">{item.rationale}</div>
                        </div>
                    ))}
                    <div className="text-xs text-muted-foreground">
                        Weekly automation endpoint for Cloud Scheduler: <code>/api/admin/content-refresh/detect</code> with
                        header <code>x-refresh-secret</code> matching <code>CONTENT_REFRESH_CRON_SECRET</code>.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, RefreshCw, WandSparkles } from "lucide-react";

import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const WORKFLOW_OPTIONS = [
    { value: "NEEDS_REFRESH", label: "Needs Refresh" },
    { value: "REFRESH_IN_PROGRESS", label: "Refresh In Progress" },
    { value: "REFRESHED", label: "Refreshed" },
] as const;

type WorkflowStatus = (typeof WORKFLOW_OPTIONS)[number]["value"];

type DetailPayload = {
    article: {
        id: string;
        title: string;
        slug: string | null;
        refreshRequested: boolean;
        refreshStatus: WorkflowStatus;
        refreshStatusUpdatedAt: string;
        nextRefreshDueAt: string | null;
        lastRefreshedAt: string | null;
        createdAt: string;
        updatedAt: string;
        freshnessDays: number;
        stale90: boolean;
        stale180: boolean;
        timeSensitive: boolean;
        timeSensitiveReasons: string[];
    };
    latestSnapshot: {
        classification: "URGENT" | "MONITOR" | "HEALTHY";
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
        queryOpportunities: Array<{
            query: string;
            impressions: number;
            clicks: number;
            avgPosition: number;
            ctr: number;
        }>;
        createdAt: string;
    } | null;
    latestBrief: {
        id: string;
        briefMarkdown: string;
        createdAt: string;
        provider: string | null;
        model: string | null;
    } | null;
    history: Array<{
        id: string;
        eventType: string;
        summary: string;
        createdAt: string;
    }>;
};

function formatDate(value: string | null | undefined) {
    if (!value) return "-";
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) return value;
    return parsed.toLocaleString();
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

function classificationBadge(snapshot: DetailPayload["latestSnapshot"]) {
    const value = snapshot?.classification;
    if (value === "URGENT") return <Badge className="bg-red-600">Urgent Refresh</Badge>;
    if (value === "MONITOR") return <Badge className="bg-yellow-500 text-black">Monitor</Badge>;
    return <Badge className="bg-emerald-600">Healthy</Badge>;
}

export function ArticleRefreshPanel({ articleId }: { articleId?: string }) {
    const [detail, setDetail] = useState<DetailPayload | null>(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("NEEDS_REFRESH");
    const [nextRefreshDueAt, setNextRefreshDueAt] = useState("");
    const [refreshSummary, setRefreshSummary] = useState("");

    async function loadDetail() {
        if (!articleId) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/admin/content-refresh/article/${articleId}/brief`, {
                cache: "no-store",
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to load refresh details");
            }

            const nextDetail = data.detail as DetailPayload;
            setDetail(nextDetail);
            setWorkflowStatus(nextDetail.article.refreshStatus);
            setNextRefreshDueAt(toInputDate(nextDetail.article.nextRefreshDueAt));
        } catch (err: any) {
            setError(err?.message || "Failed to load refresh details");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [articleId]);

    async function saveWorkflow() {
        if (!articleId) return;

        setBusy(true);
        setError(null);
        setNotice(null);

        try {
            const payload: Record<string, unknown> = {
                status: workflowStatus,
                nextRefreshDueAt: nextRefreshDueAt || null,
            };

            if (workflowStatus === "REFRESHED" && refreshSummary.trim()) {
                payload.markRefreshedSummary = refreshSummary.trim();
            }

            const res = await fetch(`/api/admin/content-refresh/article/${articleId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to update workflow");
            }

            setNotice(
                workflowStatus === "REFRESHED"
                    ? "Marked as refreshed. Safety + repurposing checks were triggered."
                    : "Refresh workflow updated."
            );
            setRefreshSummary("");
            await loadDetail();
        } catch (err: any) {
            setError(err?.message || "Failed to update workflow");
        } finally {
            setBusy(false);
        }
    }

    async function generateBrief() {
        if (!articleId) return;

        setBusy(true);
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
            if (data.detail) {
                const nextDetail = data.detail as DetailPayload;
                setDetail(nextDetail);
                setWorkflowStatus(nextDetail.article.refreshStatus);
                setNextRefreshDueAt(toInputDate(nextDetail.article.nextRefreshDueAt));
            } else {
                await loadDetail();
            }
        } catch (err: any) {
            setError(err?.message || "Failed to generate refresh brief");
        } finally {
            setBusy(false);
        }
    }

    const isRefreshedTransition = useMemo(() => workflowStatus === "REFRESHED", [workflowStatus]);

    if (!articleId) {
        return (
            <Card className="border-border/60">
                <CardHeader>
                    <CardTitle>Refresh Management</CardTitle>
                    <CardDescription>Save the article first to enable decay detection and refresh briefs.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">No article id yet.</CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-border/60">
            <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                    <span>Refresh Management</span>
                    <Button size="sm" variant="outline" onClick={() => void loadDetail()} disabled={loading || busy}>
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    </Button>
                </CardTitle>
                <CardDescription>Decay status, refresh brief, and workflow tracking for this article.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                {error ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>
                ) : null}
                {notice ? (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">{notice}</div>
                ) : null}

                {!detail && loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading refresh details...
                    </div>
                ) : null}

                {detail ? (
                    <>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                    {classificationBadge(detail.latestSnapshot)}
                                    <Badge variant="outline">Workflow: {detail.article.refreshStatus}</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Snapshot: {formatDate(detail.latestSnapshot?.createdAt || null)}
                                </div>
                            </div>

                            <div className="text-xs text-muted-foreground space-y-1">
                                <div>Last updated: {formatDate(detail.article.updatedAt)}</div>
                                <div>Last refreshed: {formatDate(detail.article.lastRefreshedAt)}</div>
                                <div>Freshness age: {detail.article.freshnessDays} days</div>
                                {detail.article.timeSensitive ? (
                                    <div className="text-amber-700 flex items-start gap-1">
                                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
                                        <span>Time-sensitive: {detail.article.timeSensitiveReasons.join(", ") || "Yes"}</span>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {detail.latestSnapshot ? (
                            <div className="rounded-md border border-border p-3 text-xs space-y-1">
                                <div>
                                    Clicks: {detail.latestSnapshot.currentClicks} vs {detail.latestSnapshot.previousClicks} (
                                    {(detail.latestSnapshot.clicksDeltaPct * 100).toFixed(1)}%)
                                </div>
                                <div>
                                    Impressions: {detail.latestSnapshot.currentImpressions} vs {detail.latestSnapshot.previousImpressions} (
                                    {(detail.latestSnapshot.impressionsDeltaPct * 100).toFixed(1)}%)
                                </div>
                                <div>
                                    Avg position: {detail.latestSnapshot.currentAvgPosition.toFixed(2)} vs {detail.latestSnapshot.previousAvgPosition.toFixed(2)} (
                                    +{detail.latestSnapshot.avgPositionDelta.toFixed(2)})
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                                No decay snapshot yet. Run detection from the content refresh dashboard.
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="refreshWorkflow">Workflow status</Label>
                            <select
                                id="refreshWorkflow"
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                value={workflowStatus}
                                onChange={(event) => setWorkflowStatus(event.target.value as WorkflowStatus)}
                            >
                                {WORKFLOW_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="nextRefreshDueAt">Next refresh due date</Label>
                            <Input
                                id="nextRefreshDueAt"
                                type="date"
                                value={nextRefreshDueAt}
                                onChange={(event) => setNextRefreshDueAt(event.target.value)}
                            />
                        </div>

                        {isRefreshedTransition ? (
                            <div className="grid gap-2">
                                <Label htmlFor="refreshSummary">What changed in this refresh? (optional)</Label>
                                <Textarea
                                    id="refreshSummary"
                                    rows={3}
                                    value={refreshSummary}
                                    onChange={(event) => setRefreshSummary(event.target.value)}
                                    placeholder="Example: Updated 2026 HSA limits, added FAQ section, updated internal links."
                                />
                            </div>
                        ) : null}

                        <div className="flex gap-2 flex-wrap">
                            <Button size="sm" onClick={() => void saveWorkflow()} disabled={busy || loading}>
                                {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                                Save Refresh Workflow
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => void generateBrief()} disabled={busy || loading}>
                                <WandSparkles className="h-3.5 w-3.5 mr-1" />
                                Generate Refresh Brief
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                                <Link href="/admin/content-refresh">Open Refresh Dashboard</Link>
                            </Button>
                        </div>

                        {detail.latestBrief ? (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="font-medium">Latest Refresh Brief</div>
                                    <div className="text-xs text-muted-foreground">
                                        {formatDate(detail.latestBrief.createdAt)}
                                        {detail.latestBrief.provider ? ` • ${detail.latestBrief.provider}` : ""}
                                    </div>
                                </div>
                                <div className="prose dark:prose-invert max-w-none rounded-md border border-border p-3 bg-background">
                                    <Markdown content={detail.latestBrief.briefMarkdown || "_No brief markdown available._"} />
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                                No refresh brief generated yet.
                            </div>
                        )}

                        {detail.history.length ? (
                            <div className="space-y-2">
                                <div className="font-medium">Refresh History</div>
                                <div className="space-y-2">
                                    {detail.history.slice(0, 8).map((item) => (
                                        <div key={item.id} className="rounded-md border border-border p-2 text-xs">
                                            <div className="font-medium">{item.summary}</div>
                                            <div className="text-muted-foreground">{item.eventType} • {formatDate(item.createdAt)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </>
                ) : null}
            </CardContent>
        </Card>
    );
}

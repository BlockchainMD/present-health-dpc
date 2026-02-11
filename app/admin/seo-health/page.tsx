"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, ShieldAlert, ShieldCheck, ShieldEllipsis, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SeoIssueSeverity = "CRITICAL" | "WARNING" | "INFO";

type SeoIssue = {
    id: string;
    code: string;
    severity: SeoIssueSeverity;
    message: string;
    fix: string;
    pagePath?: string;
    url?: string;
};

type SeoSiteCheck = {
    id: string;
    label: string;
    passed: boolean;
    severity: SeoIssueSeverity;
    message: string;
};

type SeoPageDetail = {
    path: string;
    url: string;
    statusCode: number;
    loadMs: number;
    title: string;
    metaTitleLength: number;
    metaDescriptionLength: number;
    h1Count: number;
    schemaCount: number;
    noindex: boolean;
    imagesWithoutAlt: number;
    internalLinks: string[];
    brokenInternalLinks: string[];
    issues: SeoIssue[];
    passedChecks: number;
    totalChecks: number;
};

type SeoHealthReport = {
    status: "GREEN" | "YELLOW" | "RED";
    healthScore: number;
    indexRate: number;
    indexedCount: number;
    sampleCount: number;
    impressions: number;
    clicks: number;
    warnings: string[];

    pagesAudited: number;
    sitemapUrlCount: number;
    indexedPagesCount: number | null;
    indexedPagesSource: string | null;

    passedChecks: number;
    totalChecks: number;

    issueCounts: {
        critical: number;
        warning: number;
        info: number;
        total: number;
    };

    siteChecks: SeoSiteCheck[];
    pageDetails: SeoPageDetail[];
    issues: SeoIssue[];
    trend: Array<{
        checkDate: string;
        healthScore: number;
        status: "GREEN" | "YELLOW" | "RED";
        criticalCount: number;
        warningCount: number;
        infoCount: number;
    }>;
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
    hardStopOnRed: boolean;

    auditConcurrency: number;
    requestTimeoutMs: number;
    warningPageLoadMs: number;
    criticalPageLoadMs: number;
    criticalAlertEmail: string;
};

type SeoHealthMeta = {
    updatedAt: string;
    cached: boolean;
    stale: boolean;
    config: SeoHealthConfig;
};

function statusMeta(status: SeoHealthReport["status"]) {
    if (status === "GREEN") return { label: "Healthy", color: "bg-green-600", icon: ShieldCheck };
    if (status === "YELLOW") return { label: "Watch", color: "bg-yellow-500", icon: ShieldEllipsis };
    return { label: "Critical", color: "bg-red-600", icon: ShieldAlert };
}

function severityBadge(severity: SeoIssueSeverity) {
    if (severity === "CRITICAL") return <Badge className="bg-red-600">Critical</Badge>;
    if (severity === "WARNING") return <Badge className="bg-yellow-500 text-black">Warning</Badge>;
    return <Badge variant="outline">Info</Badge>;
}

function checkBadge(passed: boolean) {
    return passed ? <Badge className="bg-green-600">Pass</Badge> : <Badge className="bg-red-600">Fail</Badge>;
}

function clampPercent(value: number) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
}

function formatDate(value: string) {
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return value;
    return d.toLocaleString();
}

export default function SeoHealthPage() {
    const [report, setReport] = useState<SeoHealthReport | null>(null);
    const [metaState, setMetaState] = useState<SeoHealthMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedPagePath, setSelectedPagePath] = useState<string>("");

    const selectedPage = useMemo(
        () => report?.pageDetails.find((page) => page.path === selectedPagePath) || null,
        [report?.pageDetails, selectedPagePath]
    );

    async function loadReport(refresh = false) {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/seo-health${refresh ? "?refresh=1" : ""}`, { cache: "no-store" });
            const data = await res.json();
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to load SEO health report");
            setReport(data.report as SeoHealthReport);
            setMetaState(data.meta as SeoHealthMeta);
            const firstPath = (data.report?.pageDetails || [])[0]?.path;
            if (firstPath) setSelectedPagePath((prev) => prev || firstPath);
        } catch (e: any) {
            setError(e?.message || "Failed to load SEO health report");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadReport(false);
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !report || !metaState) {
        return (
            <div className="max-w-5xl mx-auto space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">SEO Health</h2>
                    <p className="text-muted-foreground">Automated page and site-level SEO monitoring.</p>
                </div>
                <Card>
                    <CardContent className="py-8 text-center space-y-4">
                        <p className="text-sm text-destructive">{error || "SEO health report unavailable."}</p>
                        <Button onClick={() => void loadReport(false)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const status = statusMeta(report.status);
    const StatusIcon = status.icon;

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">SEO Health Monitor</h2>
                    <p className="text-muted-foreground">Daily checks across metadata, schema, links, and crawl/index readiness.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button asChild variant="outline">
                        <Link href="/admin/content-briefs">Content Briefs</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <a href="/api/admin/seo-health?format=csv">
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </a>
                    </Button>
                    <Button asChild variant="outline">
                        <a href="/api/admin/seo-health?format=json">
                            <Download className="h-4 w-4 mr-2" />
                            Export JSON
                        </a>
                    </Button>
                    <Button variant="outline" onClick={() => void loadReport(true)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Overall Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${status.color}`} />
                            <StatusIcon className="h-5 w-5" />
                            <div className="text-xl font-semibold">{status.label}</div>
                        </div>
                        <div className="text-3xl font-bold mt-2">{report.healthScore}%</div>
                        <p className="text-xs text-muted-foreground mt-1">Updated {formatDate(metaState.updatedAt)} {metaState.cached ? "(cached)" : ""}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Checks Passing</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{report.passedChecks} / {report.totalChecks}</div>
                        <div className="h-2 rounded bg-muted mt-3 overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${clampPercent((report.passedChecks / Math.max(1, report.totalChecks)) * 100)}%` }} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Issues</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                        <div className="flex justify-between"><span>Critical</span><span className="font-semibold text-red-600">{report.issueCounts.critical}</span></div>
                        <div className="flex justify-between"><span>Warning</span><span className="font-semibold text-yellow-600">{report.issueCounts.warning}</span></div>
                        <div className="flex justify-between"><span>Info</span><span className="font-semibold">{report.issueCounts.info}</span></div>
                        <div className="flex justify-between"><span>Total</span><span className="font-semibold">{report.issueCounts.total}</span></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Index Coverage</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                        <div className="text-2xl font-bold">{report.indexRate}%</div>
                        <div className="text-muted-foreground">Indexed: {report.indexedPagesCount ?? "N/A"} / {report.sitemapUrlCount}</div>
                        <div className="text-muted-foreground text-xs">Source: {report.indexedPagesSource || "local checks"}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.5fr,1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Issues (Sorted by Severity)</CardTitle>
                        <CardDescription>Each issue includes a fix suggestion.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[520px] overflow-auto pr-1">
                        {report.issues.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No SEO issues detected in this run.</p>
                        ) : (
                            report.issues.map((issue) => (
                                <div key={issue.id} className="rounded-lg border border-border p-3 space-y-2">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="font-medium text-sm">[{issue.code}] {issue.message}</div>
                                        {severityBadge(issue.severity)}
                                    </div>
                                    {issue.pagePath ? (
                                        <div className="text-xs text-muted-foreground">
                                            Page: <button className="text-primary hover:underline" onClick={() => setSelectedPagePath(issue.pagePath || "")}>{issue.pagePath}</button>
                                        </div>
                                    ) : null}
                                    {issue.url ? (
                                        <div className="text-xs text-muted-foreground break-all">URL: {issue.url}</div>
                                    ) : null}
                                    <div className="text-xs rounded border border-border bg-muted/10 p-2">
                                        <span className="font-medium">Fix:</span> {issue.fix}
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Site-Level Checks</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {report.siteChecks.map((check) => (
                                <div key={check.id} className="rounded-md border border-border p-2 text-sm">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium">{check.label}</span>
                                        {checkBadge(check.passed)}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">{check.message}</div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>History Trend</CardTitle>
                            <CardDescription>Recent daily snapshots.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 max-h-[260px] overflow-auto pr-1">
                            {report.trend.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No historical snapshots yet.</div>
                            ) : (
                                report.trend.map((point) => (
                                    <div key={point.checkDate} className="rounded border border-border p-2 text-xs">
                                        <div className="flex justify-between"><span>{formatDate(point.checkDate)}</span><span className="font-semibold">{point.healthScore}%</span></div>
                                        <div className="text-muted-foreground">{point.status} • C:{point.criticalCount} W:{point.warningCount} I:{point.infoCount}</div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Per-Page Detail View</CardTitle>
                    <CardDescription>Inspect checks and issues for a specific page.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="max-w-md">
                        <Label htmlFor="pagePathSelect">Page</Label>
                        <select
                            id="pagePathSelect"
                            value={selectedPagePath}
                            onChange={(e) => setSelectedPagePath(e.target.value)}
                            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                            {report.pageDetails.map((page) => (
                                <option key={page.path} value={page.path}>{page.path}</option>
                            ))}
                        </select>
                    </div>

                    {selectedPage ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
                                <div className="font-medium">Page metrics</div>
                                <div>Status: {selectedPage.statusCode}</div>
                                <div>Load: {selectedPage.loadMs} ms</div>
                                <div>Checks: {selectedPage.passedChecks}/{selectedPage.totalChecks}</div>
                                <div>Meta title length: {selectedPage.metaTitleLength}</div>
                                <div>Meta description length: {selectedPage.metaDescriptionLength}</div>
                                <div>H1 count: {selectedPage.h1Count}</div>
                                <div>Schema blocks: {selectedPage.schemaCount}</div>
                                <div>Images missing alt: {selectedPage.imagesWithoutAlt}</div>
                                <div>Noindex: {selectedPage.noindex ? "Yes" : "No"}</div>
                                <div>Internal links: {selectedPage.internalLinks.length}</div>
                                <div>Broken internal links: {selectedPage.brokenInternalLinks.length}</div>
                                <a href={selectedPage.url} className="text-primary hover:underline break-all" target="_blank" rel="noreferrer">
                                    Open page
                                </a>
                            </div>

                            <div className="rounded-lg border border-border p-4 space-y-2 text-sm max-h-[320px] overflow-auto">
                                <div className="font-medium">Page issues</div>
                                {selectedPage.issues.length === 0 ? (
                                    <div className="text-muted-foreground">No issues on this page.</div>
                                ) : (
                                    selectedPage.issues.map((issue) => (
                                        <div key={issue.id} className="rounded border border-border p-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-medium">{issue.code}</span>
                                                {severityBadge(issue.severity)}
                                            </div>
                                            <div className="text-muted-foreground text-xs mt-1">{issue.message}</div>
                                            <div className="text-xs mt-1">Fix: {issue.fix}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">Select a page to inspect.</div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Automation Controls</CardTitle>
                    <CardDescription>Daily monitoring behavior and alert settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <label className="text-sm text-muted-foreground">
                            Traffic window (days)
                            <Input
                                type="number"
                                className="mt-1"
                                value={metaState.config.trafficDays}
                                onChange={(e) => setMetaState((prev) => prev ? ({ ...prev, config: { ...prev.config, trafficDays: Number(e.target.value) } }) : prev)}
                            />
                        </label>
                        <label className="text-sm text-muted-foreground">
                            Auto-refresh (hours)
                            <Input
                                type="number"
                                className="mt-1"
                                value={metaState.config.autoRefreshHours}
                                onChange={(e) => setMetaState((prev) => prev ? ({ ...prev, config: { ...prev.config, autoRefreshHours: Number(e.target.value) } }) : prev)}
                            />
                        </label>
                        <label className="text-sm text-muted-foreground">
                            Audit concurrency
                            <Input
                                type="number"
                                className="mt-1"
                                value={metaState.config.auditConcurrency}
                                onChange={(e) => setMetaState((prev) => prev ? ({ ...prev, config: { ...prev.config, auditConcurrency: Number(e.target.value) } }) : prev)}
                            />
                        </label>
                        <label className="text-sm text-muted-foreground">
                            Request timeout (ms)
                            <Input
                                type="number"
                                className="mt-1"
                                value={metaState.config.requestTimeoutMs}
                                onChange={(e) => setMetaState((prev) => prev ? ({ ...prev, config: { ...prev.config, requestTimeoutMs: Number(e.target.value) } }) : prev)}
                            />
                        </label>
                        <label className="text-sm text-muted-foreground">
                            Warning load threshold (ms)
                            <Input
                                type="number"
                                className="mt-1"
                                value={metaState.config.warningPageLoadMs}
                                onChange={(e) => setMetaState((prev) => prev ? ({ ...prev, config: { ...prev.config, warningPageLoadMs: Number(e.target.value) } }) : prev)}
                            />
                        </label>
                        <label className="text-sm text-muted-foreground">
                            Critical load threshold (ms)
                            <Input
                                type="number"
                                className="mt-1"
                                value={metaState.config.criticalPageLoadMs}
                                onChange={(e) => setMetaState((prev) => prev ? ({ ...prev, config: { ...prev.config, criticalPageLoadMs: Number(e.target.value) } }) : prev)}
                            />
                        </label>
                    </div>

                    <div className="max-w-xl">
                        <Label htmlFor="criticalAlertEmail">Critical alert email</Label>
                        <Input
                            id="criticalAlertEmail"
                            type="email"
                            className="mt-1"
                            value={metaState.config.criticalAlertEmail}
                            onChange={(e) => setMetaState((prev) => prev ? ({ ...prev, config: { ...prev.config, criticalAlertEmail: e.target.value } }) : prev)}
                            placeholder="owner@presenthealthmd.com"
                        />
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center gap-4 text-sm">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={metaState.config.stopPublishingOnRed}
                                onChange={(e) => setMetaState((prev) => prev ? ({ ...prev, config: { ...prev.config, stopPublishingOnRed: e.target.checked } }) : prev)}
                            />
                            Stop auto-publish on RED
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={metaState.config.hardStopOnRed}
                                onChange={(e) => setMetaState((prev) => prev ? ({ ...prev, config: { ...prev.config, hardStopOnRed: e.target.checked } }) : prev)}
                            />
                            Hard-stop publish on RED
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={metaState.config.pauseDraftsOnRed}
                                onChange={(e) => setMetaState((prev) => prev ? ({ ...prev, config: { ...prev.config, pauseDraftsOnRed: e.target.checked } }) : prev)}
                            />
                            Pause draft generation on RED
                        </label>
                    </div>

                    <Button
                        onClick={async () => {
                            setSaving(true);
                            try {
                                const res = await fetch("/api/admin/seo-health/config", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(metaState.config),
                                });
                                const data = await res.json().catch(() => null);
                                if (res.ok && data?.success && data?.config) {
                                    setMetaState((prev) => prev ? ({ ...prev, config: data.config as SeoHealthConfig }) : prev);
                                }
                            } finally {
                                setSaving(false);
                            }
                        }}
                        disabled={saving}
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Save controls
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

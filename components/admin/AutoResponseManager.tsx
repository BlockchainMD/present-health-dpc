"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Source = "GENERAL_CONTACT" | "CHATBOT_LEAD" | "EMPLOYER_INQUIRY" | "STATE_WAITLIST";
type Status = "PENDING" | "SENT" | "FAILED" | "SKIPPED" | "UNSUBSCRIBED";

type TemplateConfig = {
    source: Source;
    enabled: boolean;
    delayMinutes: number;
    subjectTemplate: string;
    bodyTemplate: string;
    followUpEnabled: boolean;
    followUpDelayHours: number;
    followUpSubjectTemplate: string;
    followUpBodyTemplate: string;
    createdAt?: string;
    updatedAt?: string;
};

type PreviewData = {
    subject: string;
    bodyText: string;
    bodyHtml: string;
    unsubscribeUrl: string;
};

type LogItem = {
    id: string;
    source: Source;
    status: Status;
    recipientEmail: string;
    recipientFirstName: string | null;
    subject: string | null;
    provider: string | null;
    providerMessageId: string | null;
    errorMessage: string | null;
    scheduledFor: string | null;
    sentAt: string | null;
    openedAt: string | null;
    clickedAt: string | null;
    isFollowUp: boolean;
    nurtureStep: number | null;
    createdAt: string;
    updatedAt: string;
};

type NurtureStats = {
    name: string;
    statusCounts: {
        active: number;
        completed: number;
        stopped: number;
    };
    stepCounts: Array<{
        step: number;
        delayDays: number;
        subject: string;
        activeAtStep: number;
        pending: number;
        sent: number;
        failed: number;
        skipped: number;
        unsubscribed: number;
    }>;
};

const SOURCE_OPTIONS: Array<{ value: Source; label: string; description: string }> = [
    {
        value: "GENERAL_CONTACT",
        label: "General Contact / Campaign Lead",
        description: "Triggered from general lead capture routes.",
    },
    {
        value: "CHATBOT_LEAD",
        label: "Chatbot Lead",
        description: "Triggered when the marketing chatbot lead form is submitted.",
    },
    {
        value: "EMPLOYER_INQUIRY",
        label: "Employer Inquiry",
        description: "Triggered from /for-employers inquiry submissions.",
    },
    {
        value: "STATE_WAITLIST",
        label: "State Waitlist",
        description: "Triggered when users join the state waitlist.",
    },
];

const STATUS_OPTIONS: Array<"ALL" | Status> = ["ALL", "PENDING", "SENT", "FAILED", "SKIPPED", "UNSUBSCRIBED"];

const EMPTY_PREVIEW: PreviewData = {
    subject: "",
    bodyText: "",
    bodyHtml: "",
    unsubscribeUrl: "",
};

function clampDelay(value: number, min: number, max: number) {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, Math.trunc(value)));
}

function messageFromError(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

function toSourceFilter(value: string): "ALL" | Source {
    if (value === "ALL") return "ALL";
    return SOURCE_OPTIONS.some((x) => x.value === value) ? (value as Source) : "ALL";
}

function toStatusFilter(value: string): "ALL" | Status {
    if (value === "ALL") return "ALL";
    return STATUS_OPTIONS.includes(value as "ALL" | Status) ? (value as Status) : "ALL";
}

function badgeForStatus(status: Status) {
    if (status === "SENT") return <Badge className="bg-emerald-600">Sent</Badge>;
    if (status === "FAILED") return <Badge variant="destructive">Failed</Badge>;
    if (status === "PENDING") return <Badge className="bg-sky-600">Pending</Badge>;
    if (status === "SKIPPED") return <Badge variant="secondary">Skipped</Badge>;
    return <Badge variant="outline">Unsubscribed</Badge>;
}

function formatDate(value: string | null | undefined) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
}

export function AutoResponseManager() {
    const [templates, setTemplates] = useState<TemplateConfig[]>([]);
    const [logs, setLogs] = useState<LogItem[]>([]);
    const [nurtureStats, setNurtureStats] = useState<NurtureStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [logLoading, setLogLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [runningQueue, setRunningQueue] = useState(false);

    const [status, setStatus] = useState<
        { type: "idle" } | { type: "error"; message: string } | { type: "success"; message: string }
    >({ type: "idle" });

    const [previewInputs, setPreviewInputs] = useState({
        firstName: "Jordan",
        email: "jordan@example.com",
        state: "Texas",
        companyName: "Example Co",
        sourcePage: "/join",
    });

    const [previewBySource, setPreviewBySource] = useState<Record<string, PreviewData>>({});
    const [previewLoadingBySource, setPreviewLoadingBySource] = useState<Record<string, boolean>>({});

    const [sourceFilter, setSourceFilter] = useState<"ALL" | Source>("ALL");
    const [statusFilter, setStatusFilter] = useState<"ALL" | Status>("ALL");

    const templatesBySource = useMemo(() => {
        const map = new Map<Source, TemplateConfig>();
        for (const template of templates) {
            map.set(template.source, template);
        }
        return map;
    }, [templates]);

    async function loadTemplates() {
        const res = await fetch("/api/admin/auto-responses/config", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success || !Array.isArray(data.templates)) {
            throw new Error(data?.error || "Failed to load auto-response templates");
        }
        setTemplates(data.templates as TemplateConfig[]);
        setNurtureStats(data.nurtureSequence && typeof data.nurtureSequence === "object" ? data.nurtureSequence as NurtureStats : null);
    }

    async function loadLogs() {
        setLogLoading(true);
        try {
            const params = new URLSearchParams();
            if (sourceFilter !== "ALL") params.set("source", sourceFilter);
            if (statusFilter !== "ALL") params.set("status", statusFilter);
            params.set("limit", "150");

            const res = await fetch(`/api/admin/auto-responses/log?${params.toString()}`, {
                cache: "no-store",
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success || !Array.isArray(data.logs)) {
                throw new Error(data?.error || "Failed to load auto-response logs");
            }
            setLogs(data.logs as LogItem[]);
        } catch (error) {
            setStatus({ type: "error", message: messageFromError(error, "Failed to load logs") });
        } finally {
            setLogLoading(false);
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function run() {
            setLoading(true);
            setStatus({ type: "idle" });
            try {
                await Promise.all([loadTemplates(), loadLogs()]);
                if (!cancelled) setStatus({ type: "idle" });
            } catch (error) {
                if (!cancelled) {
                    setStatus({
                        type: "error",
                        message: messageFromError(error, "Failed to load auto-response manager"),
                    });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void run();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (loading) return;
        void loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sourceFilter, statusFilter]);

    function updateTemplate(source: Source, patch: Partial<TemplateConfig>) {
        setTemplates((prev) =>
            prev.map((template) => (template.source === source ? { ...template, ...patch } : template))
        );
    }

    async function saveTemplates() {
        setSaving(true);
        setStatus({ type: "idle" });
        try {
            const res = await fetch("/api/admin/auto-responses/config", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ templates }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success || !Array.isArray(data.templates)) {
                throw new Error(data?.error || "Failed to save templates");
            }
            setTemplates(data.templates as TemplateConfig[]);
            setStatus({ type: "success", message: "Templates saved." });
        } catch (error) {
            setStatus({ type: "error", message: messageFromError(error, "Failed to save templates") });
        } finally {
            setSaving(false);
        }
    }

    async function runQueueNow() {
        setRunningQueue(true);
        setStatus({ type: "idle" });
        try {
            const res = await fetch("/api/admin/auto-responses/run-queue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ limit: 100 }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to process queue");
            }
            setStatus({
                type: "success",
                message: `Queue processed: ${data?.result?.sent ?? 0} sent, ${data?.result?.failed ?? 0} failed.`,
            });
            await loadLogs();
        } catch (error) {
            setStatus({ type: "error", message: messageFromError(error, "Failed to process queue") });
        } finally {
            setRunningQueue(false);
        }
    }

    async function previewTemplate(source: Source, followUp: boolean) {
        const template = templatesBySource.get(source);
        if (!template) return;

        setPreviewLoadingBySource((prev) => ({ ...prev, [`${source}:${followUp ? "followUp" : "initial"}`]: true }));
        try {
            const res = await fetch("/api/admin/auto-responses/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source,
                    followUp,
                    firstName: previewInputs.firstName,
                    email: previewInputs.email,
                    state: previewInputs.state,
                    companyName: previewInputs.companyName,
                    sourcePage: previewInputs.sourcePage,
                    subjectTemplate: followUp ? template.followUpSubjectTemplate : template.subjectTemplate,
                    bodyTemplate: followUp ? template.followUpBodyTemplate : template.bodyTemplate,
                }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success || !data?.preview) {
                throw new Error(data?.error || "Failed to generate preview");
            }
            setPreviewBySource((prev) => ({ ...prev, [`${source}:${followUp ? "followUp" : "initial"}`]: data.preview }));
        } catch (error) {
            setStatus({ type: "error", message: messageFromError(error, "Failed to generate preview") });
        } finally {
            setPreviewLoadingBySource((prev) => ({
                ...prev,
                [`${source}:${followUp ? "followUp" : "initial"}`]: false,
            }));
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl space-y-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Auto-Response Emails</h1>
                    <p className="text-sm text-muted-foreground">
                        Configure marketing auto-responses for chatbot, employer inquiries, waitlist, and contact leads.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => void loadLogs()} disabled={logLoading}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh logs
                    </Button>
                    <Button variant="outline" onClick={() => void runQueueNow()} disabled={runningQueue}>
                        {runningQueue ? "Running..." : "Run queue now"}
                    </Button>
                    <Button onClick={() => void saveTemplates()} disabled={saving}>
                        {saving ? "Saving..." : "Save templates"}
                    </Button>
                </div>
            </div>

            {status.type === "error" ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{status.message}</div>
            ) : null}
            {status.type === "success" ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{status.message}</div>
            ) : null}

            <Card className="border-border/60">
                <CardHeader>
                    <CardTitle>Preview Variables</CardTitle>
                    <CardDescription>
                        Used for template preview rendering. Save templates first, then activate auto-responses.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <div className="grid gap-2">
                        <Label>First name</Label>
                        <Input
                            value={previewInputs.firstName}
                            onChange={(e) => setPreviewInputs((prev) => ({ ...prev, firstName: e.target.value }))}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Email</Label>
                        <Input
                            type="email"
                            value={previewInputs.email}
                            onChange={(e) => setPreviewInputs((prev) => ({ ...prev, email: e.target.value }))}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>State</Label>
                        <Input
                            value={previewInputs.state}
                            onChange={(e) => setPreviewInputs((prev) => ({ ...prev, state: e.target.value }))}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Company</Label>
                        <Input
                            value={previewInputs.companyName}
                            onChange={(e) => setPreviewInputs((prev) => ({ ...prev, companyName: e.target.value }))}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Source page</Label>
                        <Input
                            value={previewInputs.sourcePage}
                            onChange={(e) => setPreviewInputs((prev) => ({ ...prev, sourcePage: e.target.value }))}
                        />
                    </div>
                </CardContent>
            </Card>

            {nurtureStats ? (
                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle>{nurtureStats.name}</CardTitle>
                        <CardDescription>
                            Three-step founding-member sequence queued from waitlist, campaign, and chatbot leads.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-md border border-border bg-muted/10 p-3">
                                <div className="text-xs text-muted-foreground">Active</div>
                                <div className="text-2xl font-semibold">{nurtureStats.statusCounts.active}</div>
                            </div>
                            <div className="rounded-md border border-border bg-muted/10 p-3">
                                <div className="text-xs text-muted-foreground">Completed</div>
                                <div className="text-2xl font-semibold">{nurtureStats.statusCounts.completed}</div>
                            </div>
                            <div className="rounded-md border border-border bg-muted/10 p-3">
                                <div className="text-xs text-muted-foreground">Stopped</div>
                                <div className="text-2xl font-semibold">{nurtureStats.statusCounts.stopped}</div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-left text-muted-foreground">
                                        <th className="py-2 pr-4 font-medium">Step</th>
                                        <th className="py-2 pr-4 font-medium">Subject</th>
                                        <th className="py-2 pr-4 font-medium">Active</th>
                                        <th className="py-2 pr-4 font-medium">Pending</th>
                                        <th className="py-2 pr-4 font-medium">Sent</th>
                                        <th className="py-2 pr-4 font-medium">Skipped/Stopped</th>
                                        <th className="py-2 pr-4 font-medium">Failed</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {nurtureStats.stepCounts.map((step) => (
                                        <tr key={step.step} className="border-b border-border/60 align-top">
                                            <td className="py-3 pr-4 whitespace-nowrap">
                                                <div className="font-medium">Email {step.step}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {step.delayDays === 0 ? "Immediate" : `Day ${step.delayDays}`}
                                                </div>
                                            </td>
                                            <td className="py-3 pr-4 max-w-[360px]">{step.subject}</td>
                                            <td className="py-3 pr-4">{step.activeAtStep}</td>
                                            <td className="py-3 pr-4">{step.pending}</td>
                                            <td className="py-3 pr-4">{step.sent}</td>
                                            <td className="py-3 pr-4">{step.skipped + step.unsubscribed}</td>
                                            <td className="py-3 pr-4">{step.failed}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            <div className="grid gap-6">
                {SOURCE_OPTIONS.map((option) => {
                    const template = templatesBySource.get(option.value);
                    if (!template) return null;

                    const initialPreviewKey = `${option.value}:initial`;
                    const followUpPreviewKey = `${option.value}:followUp`;
                    const initialPreview = previewBySource[initialPreviewKey] || EMPTY_PREVIEW;
                    const followUpPreview = previewBySource[followUpPreviewKey] || EMPTY_PREVIEW;

                    return (
                        <Card key={option.value} className="border-border/60">
                            <CardHeader>
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div>
                                        <CardTitle>{option.label}</CardTitle>
                                        <CardDescription>{option.description}</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                                        <span className="text-sm text-muted-foreground">Enabled</span>
                                        <Switch
                                            checked={template.enabled}
                                            onCheckedChange={(checked) => updateTemplate(option.value, { enabled: checked })}
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label>Delay (minutes, 0-30)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={30}
                                            value={template.delayMinutes}
                                            onChange={(e) =>
                                                updateTemplate(option.value, {
                                                    delayMinutes: clampDelay(Number(e.target.value || "0"), 0, 30),
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Subject template</Label>
                                        <Input
                                            value={template.subjectTemplate}
                                            onChange={(e) => updateTemplate(option.value, { subjectTemplate: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label>Body template</Label>
                                    <Textarea
                                        rows={8}
                                        value={template.bodyTemplate}
                                        onChange={(e) => updateTemplate(option.value, { bodyTemplate: e.target.value })}
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => void previewTemplate(option.value, false)}
                                        disabled={Boolean(previewLoadingBySource[initialPreviewKey])}
                                    >
                                        {previewLoadingBySource[initialPreviewKey] ? "Previewing..." : "Preview initial"}
                                    </Button>
                                </div>

                                {initialPreview.subject ? (
                                    <div className="rounded-md border border-border bg-muted/10 p-4 space-y-3">
                                        <div className="text-sm"><span className="font-medium">Subject:</span> {initialPreview.subject}</div>
                                        <pre className="text-xs whitespace-pre-wrap rounded-md border border-border bg-background p-3">
                                            {initialPreview.bodyText}
                                        </pre>
                                    </div>
                                ) : null}

                                <div className="space-y-4 rounded-lg border border-border bg-muted/10 p-4">
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div>
                                            <div className="font-medium text-foreground">Optional Follow-up</div>
                                            <div className="text-xs text-muted-foreground">
                                                Limit to one follow-up (max two total auto-emails per lead).
                                            </div>
                                        </div>
                                        <Switch
                                            checked={template.followUpEnabled}
                                            onCheckedChange={(checked) => updateTemplate(option.value, { followUpEnabled: checked })}
                                        />
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label>Follow-up delay (hours)</Label>
                                            <Input
                                                type="number"
                                                min={24}
                                                max={336}
                                                value={template.followUpDelayHours}
                                                onChange={(e) =>
                                                    updateTemplate(option.value, {
                                                        followUpDelayHours: clampDelay(Number(e.target.value || "72"), 24, 336),
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Follow-up subject</Label>
                                            <Input
                                                value={template.followUpSubjectTemplate}
                                                onChange={(e) =>
                                                    updateTemplate(option.value, {
                                                        followUpSubjectTemplate: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>Follow-up body</Label>
                                        <Textarea
                                            rows={6}
                                            value={template.followUpBodyTemplate}
                                            onChange={(e) =>
                                                updateTemplate(option.value, {
                                                    followUpBodyTemplate: e.target.value,
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => void previewTemplate(option.value, true)}
                                            disabled={Boolean(previewLoadingBySource[followUpPreviewKey]) || !template.followUpEnabled}
                                        >
                                            {previewLoadingBySource[followUpPreviewKey] ? "Previewing..." : "Preview follow-up"}
                                        </Button>
                                    </div>

                                    {followUpPreview.subject ? (
                                        <div className="rounded-md border border-border bg-background p-4 space-y-3">
                                            <div className="text-sm"><span className="font-medium">Subject:</span> {followUpPreview.subject}</div>
                                            <pre className="text-xs whitespace-pre-wrap rounded-md border border-border bg-muted/10 p-3">
                                                {followUpPreview.bodyText}
                                            </pre>
                                        </div>
                                    ) : null}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Card className="border-border/60">
                <CardHeader className="flex-row items-start justify-between gap-4 flex-wrap">
                    <div>
                        <CardTitle>Auto-Response Log</CardTitle>
                        <CardDescription>
                            Sent, pending, skipped, and failed auto-response emails with open/click tracking.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={sourceFilter}
                            onChange={(e) => setSourceFilter(toSourceFilter(e.target.value))}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                            <option value="ALL">All sources</option>
                            {SOURCE_OPTIONS.map((source) => (
                                <option key={source.value} value={source.value}>
                                    {source.label}
                                </option>
                            ))}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(toStatusFilter(e.target.value))}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                            {STATUS_OPTIONS.map((statusValue) => (
                                <option key={statusValue} value={statusValue}>
                                    {statusValue === "ALL" ? "All statuses" : statusValue}
                                </option>
                            ))}
                        </select>
                    </div>
                </CardHeader>
                <CardContent>
                    {logLoading ? (
                        <div className="flex justify-center p-10">
                            <Loader2 className="h-7 w-7 animate-spin text-primary" />
                        </div>
                    ) : logs.length ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-left text-muted-foreground">
                                        <th className="py-2 pr-4 font-medium">Created</th>
                                        <th className="py-2 pr-4 font-medium">Source</th>
                                        <th className="py-2 pr-4 font-medium">Recipient</th>
                                        <th className="py-2 pr-4 font-medium">Status</th>
                                        <th className="py-2 pr-4 font-medium">Sent</th>
                                        <th className="py-2 pr-4 font-medium">Opened</th>
                                        <th className="py-2 pr-4 font-medium">Clicked</th>
                                        <th className="py-2 pr-4 font-medium">Provider</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => {
                                        const label = SOURCE_OPTIONS.find((x) => x.value === log.source)?.label || log.source;
                                        return (
                                            <tr key={log.id} className="border-b border-border/60 align-top">
                                                <td className="py-3 pr-4 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                                                <td className="py-3 pr-4">
                                                    <div className="font-medium">{label}</div>
                                                    {log.nurtureStep ? (
                                                        <div className="text-[11px] text-muted-foreground">
                                                            Nurture step {log.nurtureStep}
                                                        </div>
                                                    ) : log.isFollowUp ? (
                                                        <div className="text-[11px] text-muted-foreground">Follow-up</div>
                                                    ) : null}
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <div className="font-medium">{log.recipientFirstName || "-"}</div>
                                                    <div className="text-xs text-muted-foreground">{log.recipientEmail}</div>
                                                    {log.subject ? (
                                                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2 max-w-[280px]">
                                                            {log.subject}
                                                        </div>
                                                    ) : null}
                                                    {log.errorMessage ? (
                                                        <div className="text-xs text-red-700 mt-1 max-w-[280px]">{log.errorMessage}</div>
                                                    ) : null}
                                                </td>
                                                <td className="py-3 pr-4">{badgeForStatus(log.status)}</td>
                                                <td className="py-3 pr-4 whitespace-nowrap">{formatDate(log.sentAt || log.scheduledFor)}</td>
                                                <td className="py-3 pr-4 whitespace-nowrap">{formatDate(log.openedAt)}</td>
                                                <td className="py-3 pr-4 whitespace-nowrap">{formatDate(log.clickedAt)}</td>
                                                <td className="py-3 pr-4">
                                                    <div>{log.provider || "-"}</div>
                                                    {log.providerMessageId ? (
                                                        <div className="text-[11px] text-muted-foreground max-w-[200px] truncate">
                                                            {log.providerMessageId}
                                                        </div>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="rounded-md border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                            No auto-response log entries yet.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

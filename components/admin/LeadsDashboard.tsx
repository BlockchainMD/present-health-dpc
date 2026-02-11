"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Loader2,
    RefreshCw,
    Download,
    Bell,
    GripVertical,
    Mail,
    Phone,
    Building2,
    MessageSquare,
    Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type LeadSource = "CHATBOT" | "EMPLOYER_INQUIRY" | "WAITLIST" | "CONTACT_FORM" | "MANUAL";
type LeadStatus = "NEW" | "CONTACTED" | "CONSULTATION_SCHEDULED" | "ENROLLED" | "LOST";
type MembershipTier = "INDIVIDUAL" | "COUPLE" | "FAMILY" | "EMPLOYER" | "CUSTOM";

type LeadRow = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    fullName: string;
    email: string;
    phone: string | null;
    state: string | null;
    source: LeadSource;
    sourceLabel: string;
    sourcePage: string | null;
    status: LeadStatus;
    statusLabel: string;
    notes: string | null;
    createdAt: string;
    statusUpdatedAt: string;
    assignedPhysicianId: string | null;
    assignedPhysician?: { id: string; name: string; slug: string } | null;
    membershipTier: MembershipTier | null;
    monthlyMembershipRate: number | null;
    stale: boolean;
};

type LeadDetail = LeadRow & {
    enrolledAt: string | null;
    sourceMeta: any;
    chatbotSessionId: string | null;
    chatbotLogCount: number;
    employerInquiry:
        | {
            companyName: string;
            employeeCount: number | null;
            employeeCountRange: string | null;
            message: string | null;
            status: string;
            submittedAt: string;
        }
        | null;
    activities: Array<{
        id: string;
        type: string;
        note: string | null;
        fromStatus: LeadStatus | null;
        toStatus: LeadStatus | null;
        createdAt: string;
        metadata: any;
        createdByUser: { id: string; name: string | null; email: string } | null;
    }>;
};

type Metrics = {
    totals: {
        allLeads: number;
        leadsThisMonth: number;
        leadsLastMonth: number;
        openLeads: number;
        enrolledCount: number;
        currentMRR: number;
        annualRunRate: number;
    };
    conversionRate: {
        thisMonth: number;
        lastMonth: number;
        allTime: number;
    };
    averageLeadToEnrollmentDays: number | null;
    bySource: {
        thisMonth: Array<{ source: LeadSource; label: string; count: number }>;
        allTime: Array<{ source: LeadSource; label: string; count: number }>;
    };
    leadsByState: Array<{ state: string; count: number }>;
    stale: {
        total: number;
        new: number;
        contacted: number;
    };
    mrr: {
        current: number;
        overTime: Array<{ key: string; label: string; monthAddedMrr: number; cumulativeMrr: number }>;
        avgEnrolledMonthlyRate: number;
        projectedNextMonthMrr: number;
        expectedNextMonthEnrollments: number;
    };
    goals: {
        arrTarget: number;
        arrProgress: number;
        providerTwoMinMembers: number;
        providerTwoMaxMembers: number;
        providerTwoProgressToMin: number;
        providerTwoProgressToMax: number;
    };
};

type LeadOptions = {
    states: string[];
    physicians: Array<{ id: string; name: string; slug: string }>;
    sourceOptions: LeadSource[];
    statusOptions: LeadStatus[];
    membershipTierOptions: MembershipTier[];
};

const STATUS_ORDER: LeadStatus[] = [
    "NEW",
    "CONTACTED",
    "CONSULTATION_SCHEDULED",
    "ENROLLED",
    "LOST",
];

const STATUS_LABELS: Record<LeadStatus, string> = {
    NEW: "New",
    CONTACTED: "Contacted",
    CONSULTATION_SCHEDULED: "Consultation Scheduled",
    ENROLLED: "Enrolled",
    LOST: "Lost",
};

const TIER_LABELS: Record<MembershipTier, string> = {
    INDIVIDUAL: "Individual",
    COUPLE: "Couple",
    FAMILY: "Family",
    EMPLOYER: "Employer",
    CUSTOM: "Custom",
};

function formatDate(value: string | null | undefined) {
    if (!value) return "";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    return date.toLocaleString();
}

function formatCurrency(value: number | null | undefined) {
    const amount = typeof value === "number" ? value : 0;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function formatPercent(value: number | null | undefined) {
    const n = typeof value === "number" ? value : 0;
    return `${(n * 100).toFixed(1)}%`;
}

function clampPercent(value: number) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
}

function buildQuery(filters: {
    source: string;
    status: string;
    state: string;
    q: string;
    dateFrom: string;
    dateTo: string;
    page: number;
    pageSize: number;
}) {
    const params = new URLSearchParams();
    if (filters.source && filters.source !== "ALL") params.set("source", filters.source);
    if (filters.status && filters.status !== "ALL") params.set("status", filters.status);
    if (filters.state && filters.state !== "ALL") params.set("state", filters.state);
    if (filters.q.trim()) params.set("q", filters.q.trim());
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    params.set("page", String(filters.page));
    params.set("pageSize", String(filters.pageSize));
    return params.toString();
}

export function LeadsDashboard() {
    const [loading, setLoading] = useState(true);
    const [metricsLoading, setMetricsLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [staleAlerting, setStaleAlerting] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [leads, setLeads] = useState<LeadRow[]>([]);
    const [total, setTotal] = useState(0);
    const [options, setOptions] = useState<LeadOptions | null>(null);
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [staleCount, setStaleCount] = useState(0);

    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const [dragLeadId, setDragLeadId] = useState<string | null>(null);

    const [filters, setFilters] = useState({
        source: "ALL",
        status: "ALL",
        state: "ALL",
        q: "",
        dateFrom: "",
        dateTo: "",
        page: 1,
        pageSize: 100,
    });

    const [manualLead, setManualLead] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        state: "",
    });
    const [showManualLeadForm, setShowManualLeadForm] = useState(false);
    const [noteDraft, setNoteDraft] = useState("");

    const canPrev = filters.page > 1;
    const canNext = filters.page * filters.pageSize < total;

    const groupedByStatus = useMemo(() => {
        const map = new Map<LeadStatus, LeadRow[]>();
        for (const status of STATUS_ORDER) map.set(status, []);
        for (const lead of leads) {
            const list = map.get(lead.status);
            if (list) list.push(lead);
        }
        return map;
    }, [leads]);

    const sourceMax = useMemo(() => {
        const counts = metrics?.bySource.thisMonth.map((x) => x.count) || [0];
        return Math.max(1, ...counts);
    }, [metrics?.bySource.thisMonth]);

    const stateMax = useMemo(() => {
        const counts = metrics?.leadsByState.map((x) => x.count) || [0];
        return Math.max(1, ...counts);
    }, [metrics?.leadsByState]);

    const loadLeads = useCallback(
        async (sync = false, nextPage = filters.page) => {
            const params = new URLSearchParams(buildQuery({ ...filters, page: nextPage }));
            params.set("sync", sync ? "1" : "0");

            const res = await fetch(`/api/admin/leads?${params.toString()}`, { cache: "no-store" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to load leads");
            }

            setLeads(Array.isArray(data.leads) ? data.leads : []);
            setTotal(typeof data.total === "number" ? data.total : 0);
            setStaleCount(typeof data.staleCount === "number" ? data.staleCount : 0);

            if (data.options) setOptions(data.options as LeadOptions);

            const nextSelected = selectedLeadId
                ? (Array.isArray(data.leads) ? (data.leads as LeadRow[]).find((x) => x.id === selectedLeadId) : null)
                : null;
            if (!selectedLeadId && Array.isArray(data.leads) && data.leads.length > 0) {
                setSelectedLeadId(data.leads[0].id);
            }
            if (selectedLeadId && !nextSelected) {
                setSelectedLeadId(Array.isArray(data.leads) && data.leads.length > 0 ? data.leads[0].id : null);
            }

            return data;
        },
        [filters, selectedLeadId]
    );

    const loadMetrics = useCallback(async () => {
        const params = new URLSearchParams(buildQuery(filters));
        const res = await fetch(`/api/admin/leads/metrics?${params.toString()}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
            throw new Error(data?.error || "Failed to load lead metrics");
        }
        setMetrics(data.metrics as Metrics);
    }, [filters]);

    const loadLeadDetail = useCallback(async (leadId: string | null) => {
        if (!leadId) {
            setSelectedLead(null);
            return;
        }

        setDetailLoading(true);
        try {
            const res = await fetch(`/api/admin/leads/${leadId}`, { cache: "no-store" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to load lead detail");
            }
            setSelectedLead(data.lead as LeadDetail);
        } catch (e: any) {
            setError(e?.message || "Failed to load lead detail");
            setSelectedLead(null);
        } finally {
            setDetailLoading(false);
        }
    }, []);

    const loadAll = useCallback(async (sync = true) => {
        setLoading(true);
        setMetricsLoading(true);
        setError(null);

        try {
            await Promise.all([loadLeads(sync), loadMetrics()]);
        } catch (e: any) {
            setError(e?.message || "Failed to load leads dashboard");
        } finally {
            setLoading(false);
            setMetricsLoading(false);
        }
    }, [loadLeads, loadMetrics]);

    useEffect(() => {
        void loadAll(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        void loadLeadDetail(selectedLeadId);
    }, [loadLeadDetail, selectedLeadId]);

    async function refreshData(sync = false) {
        setLoading(true);
        setMetricsLoading(true);
        setError(null);
        try {
            await Promise.all([loadLeads(sync), loadMetrics()]);
        } catch (e: any) {
            setError(e?.message || "Failed to refresh dashboard");
        } finally {
            setLoading(false);
            setMetricsLoading(false);
        }
    }

    async function changeLeadStatus(leadId: string, nextStatus: LeadStatus) {
        setSaving(`status:${leadId}`);
        setError(null);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/leads/${leadId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nextStatus }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to update lead status");

            setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, status: nextStatus } : lead)));
            if (selectedLeadId === leadId) setSelectedLead(data.lead as LeadDetail);
            await loadMetrics();
            setMessage("Lead status updated.");
        } catch (e: any) {
            setError(e?.message || "Failed to update status");
        } finally {
            setSaving(null);
        }
    }

    async function saveLeadDetailPatch(payload: Record<string, unknown>) {
        if (!selectedLeadId) return;
        setSaving(`lead:${selectedLeadId}`);
        setError(null);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/leads/${selectedLeadId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to save lead changes");

            const next = data.lead as LeadDetail;
            setSelectedLead(next);
            setLeads((prev) => prev.map((x) => (x.id === next.id ? { ...x, ...next } : x)));
            await loadMetrics();
            setMessage("Lead details saved.");
        } catch (e: any) {
            setError(e?.message || "Failed to save lead");
        } finally {
            setSaving(null);
        }
    }

    async function addNote() {
        if (!selectedLeadId) return;
        const text = noteDraft.trim();
        if (!text) return;

        setSaving(`note:${selectedLeadId}`);
        setError(null);
        setMessage(null);

        try {
            const res = await fetch(`/api/admin/leads/${selectedLeadId}/notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ note: text }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to add note");

            const next = data.lead as LeadDetail;
            setSelectedLead(next);
            setLeads((prev) => prev.map((x) => (x.id === next.id ? { ...x, notes: next.notes } : x)));
            setNoteDraft("");
            setMessage("Note added.");
        } catch (e: any) {
            setError(e?.message || "Failed to add note");
        } finally {
            setSaving(null);
        }
    }

    async function syncSources() {
        setSyncing(true);
        setError(null);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "SYNC" }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to sync lead sources");

            await refreshData(false);
            setMessage(
                `Lead sync complete (${data.result?.processed || 0} processed; ${data.result?.created || 0} new, ${data.result?.updated || 0} updated).`
            );
        } catch (e: any) {
            setError(e?.message || "Failed to sync sources");
        } finally {
            setSyncing(false);
        }
    }

    async function sendStaleAlerts() {
        setStaleAlerting(true);
        setError(null);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/leads/stale-alert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ force: false, limit: 200 }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to send stale lead alerts");

            setMessage(`Stale lead alerts sent for ${data.result?.sent || 0} lead(s).`);
            await refreshData(false);
        } catch (e: any) {
            setError(e?.message || "Failed to send stale lead alerts");
        } finally {
            setStaleAlerting(false);
        }
    }

    async function createManualLead() {
        setSaving("manual");
        setError(null);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "CREATE_MANUAL",
                    firstName: manualLead.firstName,
                    lastName: manualLead.lastName,
                    email: manualLead.email,
                    phone: manualLead.phone,
                    state: manualLead.state,
                    sourcePage: "/admin/leads",
                    status: "NEW",
                }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to create manual lead");

            setManualLead({ firstName: "", lastName: "", email: "", phone: "", state: "" });
            setShowManualLeadForm(false);
            await refreshData(false);
            if (data.lead?.id) setSelectedLeadId(data.lead.id);
            setMessage("Manual lead created.");
        } catch (e: any) {
            setError(e?.message || "Failed to create lead");
        } finally {
            setSaving(null);
        }
    }

    function exportCsvHref() {
        const params = new URLSearchParams(buildQuery(filters));
        return `/api/admin/leads/export?${params.toString()}`;
    }

    async function changePage(nextPage: number) {
        setFilters((prev) => ({ ...prev, page: nextPage }));
        setLoading(true);
        try {
            await loadLeads(false, nextPage);
        } catch (e: any) {
            setError(e?.message || "Failed to load page");
        } finally {
            setLoading(false);
        }
    }

    const pipelineColumns = STATUS_ORDER.map((status) => ({
        status,
        label: STATUS_LABELS[status],
        leads: groupedByStatus.get(status) || [],
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Leads & conversion dashboard</h1>
                    <p className="text-sm text-muted-foreground">
                        Unified view of chatbot, employer inquiry, waitlist, and contact-form leads.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => void refreshData(false)} disabled={loading || metricsLoading}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button variant="outline" onClick={() => void syncSources()} disabled={syncing}>
                        {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Sync sources
                    </Button>
                    <Button variant="outline" onClick={() => void sendStaleAlerts()} disabled={staleAlerting}>
                        {staleAlerting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
                        Send stale alerts
                    </Button>
                    <Button asChild>
                        <a href={exportCsvHref()}>
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </a>
                    </Button>
                </div>
            </div>

            {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
            ) : null}
            {message ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-border/60">
                    <CardHeader className="pb-2">
                        <CardDescription>Total leads (this month)</CardDescription>
                        <CardTitle className="text-2xl">{metricsLoading ? "..." : metrics?.totals.leadsThisMonth || 0}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                        {metricsLoading ? "Loading..." : `${metrics?.totals.openLeads || 0} currently open`}
                    </CardContent>
                </Card>
                <Card className="border-border/60">
                    <CardHeader className="pb-2">
                        <CardDescription>Conversion rate (all time)</CardDescription>
                        <CardTitle className="text-2xl">{metricsLoading ? "..." : formatPercent(metrics?.conversionRate.allTime || 0)}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                        {metricsLoading
                            ? "Loading..."
                            : `This month ${formatPercent(metrics?.conversionRate.thisMonth || 0)} • Last month ${formatPercent(metrics?.conversionRate.lastMonth || 0)}`}
                    </CardContent>
                </Card>
                <Card className="border-border/60">
                    <CardHeader className="pb-2">
                        <CardDescription>Average lead to enrollment</CardDescription>
                        <CardTitle className="text-2xl">
                            {metricsLoading
                                ? "..."
                                : metrics?.averageLeadToEnrollmentDays !== null && metrics?.averageLeadToEnrollmentDays !== undefined
                                    ? `${metrics.averageLeadToEnrollmentDays} days`
                                    : "N/A"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                        Time between lead capture and enrolled status.
                    </CardContent>
                </Card>
                <Card className="border-border/60">
                    <CardHeader className="pb-2">
                        <CardDescription>Stale follow-up alerts</CardDescription>
                        <CardTitle className="text-2xl">{metricsLoading ? "..." : staleCount}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                        {metricsLoading
                            ? "Loading..."
                            : `${metrics?.stale.new || 0} in new >24h • ${metrics?.stale.contacted || 0} in contacted >7d`}
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border/60">
                <CardHeader>
                    <CardTitle className="text-lg">Pipeline filters</CardTitle>
                    <CardDescription>
                        {total} total lead(s)
                        {filters.source !== "ALL" ? ` • source: ${filters.source}` : ""}
                        {filters.state !== "ALL" ? ` • state: ${filters.state}` : ""}
                        {filters.status !== "ALL" ? ` • status: ${filters.status}` : ""}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-6 items-end">
                    <div className="grid gap-1">
                        <Label htmlFor="sourceFilter">Source</Label>
                        <select
                            id="sourceFilter"
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            value={filters.source}
                            onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value, page: 1 }))}
                        >
                            <option value="ALL">All</option>
                            {(options?.sourceOptions || []).map((source) => (
                                <option key={source} value={source}>
                                    {source}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="stateFilter">State</Label>
                        <select
                            id="stateFilter"
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            value={filters.state}
                            onChange={(e) => setFilters((prev) => ({ ...prev, state: e.target.value, page: 1 }))}
                        >
                            <option value="ALL">All</option>
                            {(options?.states || []).map((state) => (
                                <option key={state} value={state}>
                                    {state}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="statusFilter">Status</Label>
                        <select
                            id="statusFilter"
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            value={filters.status}
                            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
                        >
                            <option value="ALL">All</option>
                            {(options?.statusOptions || []).map((status) => (
                                <option key={status} value={status}>
                                    {STATUS_LABELS[status]}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="dateFrom">Date from</Label>
                        <Input
                            id="dateFrom"
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value, page: 1 }))}
                        />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="dateTo">Date to</Label>
                        <Input
                            id="dateTo"
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value, page: 1 }))}
                        />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="search">Search</Label>
                        <Input
                            id="search"
                            value={filters.q}
                            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value, page: 1 }))}
                            placeholder="Name, email, notes..."
                        />
                    </div>

                    <div className="md:col-span-6 flex gap-2 flex-wrap">
                        <Button onClick={() => void refreshData(false)} disabled={loading || metricsLoading}>
                            Apply filters
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setFilters({
                                    source: "ALL",
                                    status: "ALL",
                                    state: "ALL",
                                    q: "",
                                    dateFrom: "",
                                    dateTo: "",
                                    page: 1,
                                    pageSize: 100,
                                });
                            }}
                        >
                            Reset
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[2fr,1fr]">
                <Card className="border-border/60">
                    <CardHeader className="space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                                <CardTitle className="text-lg">Lead pipeline</CardTitle>
                                <CardDescription>Drag and drop cards across statuses to update workflow.</CardDescription>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>
                                    Page {filters.page} / {Math.max(1, Math.ceil(total / filters.pageSize))}
                                </span>
                                <Button variant="outline" size="sm" disabled={!canPrev || loading} onClick={() => void changePage(filters.page - 1)}>
                                    Prev
                                </Button>
                                <Button variant="outline" size="sm" disabled={!canNext || loading} onClick={() => void changePage(filters.page + 1)}>
                                    Next
                                </Button>
                                <select
                                    value={String(filters.pageSize)}
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            pageSize: Number.parseInt(e.target.value, 10) || 100,
                                            page: 1,
                                        }))
                                    }
                                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                                    aria-label="Page size"
                                >
                                    {[50, 100, 150, 250].map((n) => (
                                        <option key={n} value={String(n)}>
                                            {n}/page
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setShowManualLeadForm((prev) => !prev)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add manual lead
                            </Button>
                        </div>

                        {showManualLeadForm ? (
                            <div className="rounded-lg border border-border bg-muted/10 p-4 grid gap-3 md:grid-cols-2">
                                <div className="grid gap-1">
                                    <Label htmlFor="manualFirstName">First name</Label>
                                    <Input
                                        id="manualFirstName"
                                        value={manualLead.firstName}
                                        onChange={(e) => setManualLead((prev) => ({ ...prev, firstName: e.target.value }))}
                                    />
                                </div>
                                <div className="grid gap-1">
                                    <Label htmlFor="manualLastName">Last name</Label>
                                    <Input
                                        id="manualLastName"
                                        value={manualLead.lastName}
                                        onChange={(e) => setManualLead((prev) => ({ ...prev, lastName: e.target.value }))}
                                    />
                                </div>
                                <div className="grid gap-1">
                                    <Label htmlFor="manualEmail">Email</Label>
                                    <Input
                                        id="manualEmail"
                                        type="email"
                                        value={manualLead.email}
                                        onChange={(e) => setManualLead((prev) => ({ ...prev, email: e.target.value }))}
                                    />
                                </div>
                                <div className="grid gap-1">
                                    <Label htmlFor="manualPhone">Phone</Label>
                                    <Input
                                        id="manualPhone"
                                        value={manualLead.phone}
                                        onChange={(e) => setManualLead((prev) => ({ ...prev, phone: e.target.value }))}
                                    />
                                </div>
                                <div className="grid gap-1">
                                    <Label htmlFor="manualState">State</Label>
                                    <Input
                                        id="manualState"
                                        value={manualLead.state}
                                        onChange={(e) => setManualLead((prev) => ({ ...prev, state: e.target.value }))}
                                        placeholder="Texas"
                                    />
                                </div>
                                <div className="flex items-end gap-2">
                                    <Button
                                        onClick={() => void createManualLead()}
                                        disabled={saving === "manual" || !manualLead.email.trim()}
                                    >
                                        {saving === "manual" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                        Save lead
                                    </Button>
                                    <Button variant="outline" onClick={() => setShowManualLeadForm(false)}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        {loading ? (
                            <div className="flex justify-center p-10">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 min-w-[900px]">
                                {pipelineColumns.map((col) => (
                                    <div
                                        key={col.status}
                                        className="rounded-lg border border-border bg-muted/10 p-3 min-h-[220px]"
                                        onDragOver={(event) => event.preventDefault()}
                                        onDrop={(event) => {
                                            event.preventDefault();
                                            const droppedLeadId = event.dataTransfer.getData("text/lead-id") || dragLeadId;
                                            setDragLeadId(null);
                                            if (!droppedLeadId) return;
                                            void changeLeadStatus(droppedLeadId, col.status);
                                        }}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                            <h3 className="text-sm font-semibold">{col.label}</h3>
                                            <Badge variant="secondary">{col.leads.length}</Badge>
                                        </div>

                                        <div className="space-y-2">
                                            {col.leads.map((lead) => {
                                                const selected = lead.id === selectedLeadId;
                                                const isSaving = saving === `status:${lead.id}`;
                                                return (
                                                    <button
                                                        key={lead.id}
                                                        type="button"
                                                        draggable
                                                        onDragStart={(event) => {
                                                            setDragLeadId(lead.id);
                                                            event.dataTransfer.setData("text/lead-id", lead.id);
                                                            event.dataTransfer.effectAllowed = "move";
                                                        }}
                                                        onClick={() => setSelectedLeadId(lead.id)}
                                                        className={`w-full rounded-md border p-3 text-left bg-background hover:border-primary/60 transition-colors ${
                                                            selected ? "border-primary shadow-sm" : "border-border"
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="text-sm font-medium leading-tight">{lead.fullName}</div>
                                                            <GripVertical className="h-4 w-4 text-muted-foreground/70" />
                                                        </div>
                                                        <div className="mt-1 text-xs text-muted-foreground truncate">{lead.email}</div>
                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                            <Badge variant="outline" className="text-[10px]">
                                                                {lead.sourceLabel}
                                                            </Badge>
                                                            {lead.state ? (
                                                                <Badge variant="outline" className="text-[10px]">
                                                                    {lead.state}
                                                                </Badge>
                                                            ) : null}
                                                            {lead.stale ? (
                                                                <Badge className="bg-amber-600 text-[10px]">Stale</Badge>
                                                            ) : null}
                                                        </div>
                                                        <div className="mt-2 text-[11px] text-muted-foreground">
                                                            {formatDate(lead.createdAt)}
                                                        </div>
                                                        {isSaving ? (
                                                            <div className="mt-2 flex items-center text-[11px] text-muted-foreground">
                                                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                                Updating
                                                            </div>
                                                        ) : null}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-lg">Lead detail</CardTitle>
                            <CardDescription>
                                {selectedLead ? `Selected: ${selectedLead.fullName}` : "Choose a lead from the pipeline"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {detailLoading ? (
                                <div className="flex justify-center py-6">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : !selectedLead ? (
                                <div className="text-sm text-muted-foreground">No lead selected.</div>
                            ) : (
                                <>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">{STATUS_LABELS[selectedLead.status]}</Badge>
                                            <Badge variant="outline">{selectedLead.sourceLabel}</Badge>
                                            {selectedLead.stale ? <Badge className="bg-amber-600">Stale</Badge> : null}
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Mail className="h-4 w-4" />
                                            <a className="text-primary hover:underline" href={`mailto:${selectedLead.email}`}>
                                                {selectedLead.email}
                                            </a>
                                        </div>
                                        {selectedLead.phone ? (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Phone className="h-4 w-4" />
                                                <a className="text-primary hover:underline" href={`tel:${selectedLead.phone}`}>
                                                    {selectedLead.phone}
                                                </a>
                                            </div>
                                        ) : null}
                                        <div className="text-muted-foreground">State: {selectedLead.state || "(not provided)"}</div>
                                        <div className="text-muted-foreground">Created: {formatDate(selectedLead.createdAt)}</div>
                                        <div className="text-muted-foreground">Status updated: {formatDate(selectedLead.statusUpdatedAt)}</div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="detailStatus">Status</Label>
                                        <select
                                            id="detailStatus"
                                            value={selectedLead.status}
                                            onChange={(e) => void changeLeadStatus(selectedLead.id, e.target.value as LeadStatus)}
                                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                            disabled={saving === `status:${selectedLead.id}`}
                                        >
                                            {STATUS_ORDER.map((status) => (
                                                <option key={status} value={status}>
                                                    {STATUS_LABELS[status]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="detailPhysician">Assigned physician</Label>
                                        <select
                                            id="detailPhysician"
                                            value={selectedLead.assignedPhysicianId || ""}
                                            onChange={(e) =>
                                                void saveLeadDetailPatch({
                                                    assignedPhysicianId: e.target.value || null,
                                                })
                                            }
                                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                            disabled={saving === `lead:${selectedLead.id}`}
                                        >
                                            <option value="">Unassigned</option>
                                            {(options?.physicians || []).map((physician) => (
                                                <option key={physician.id} value={physician.id}>
                                                    {physician.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="detailTier">Membership tier</Label>
                                        <select
                                            id="detailTier"
                                            value={selectedLead.membershipTier || ""}
                                            onChange={(e) =>
                                                void saveLeadDetailPatch({
                                                    membershipTier: e.target.value || null,
                                                })
                                            }
                                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                            disabled={saving === `lead:${selectedLead.id}`}
                                        >
                                            <option value="">Unknown</option>
                                            {(options?.membershipTierOptions || []).map((tier) => (
                                                <option key={tier} value={tier}>
                                                    {TIER_LABELS[tier]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="detailRate">Monthly rate ($)</Label>
                                        <Input
                                            id="detailRate"
                                            type="number"
                                            min={0}
                                            value={selectedLead.monthlyMembershipRate || ""}
                                            onChange={(e) =>
                                                setSelectedLead((prev) =>
                                                    prev
                                                        ? {
                                                            ...prev,
                                                            monthlyMembershipRate: e.target.value
                                                                ? Number.parseInt(e.target.value, 10)
                                                                : null,
                                                        }
                                                        : prev
                                                )
                                            }
                                            onBlur={() =>
                                                void saveLeadDetailPatch({
                                                    monthlyMembershipRate: selectedLead.monthlyMembershipRate,
                                                })
                                            }
                                            disabled={saving === `lead:${selectedLead.id}`}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="detailNotes">Lead notes</Label>
                                        <Textarea
                                            id="detailNotes"
                                            value={selectedLead.notes || ""}
                                            onChange={(e) =>
                                                setSelectedLead((prev) => (prev ? { ...prev, notes: e.target.value } : prev))
                                            }
                                            onBlur={() => void saveLeadDetailPatch({ notes: selectedLead.notes || "" })}
                                            className="min-h-[90px]"
                                            disabled={saving === `lead:${selectedLead.id}`}
                                        />
                                    </div>

                                    <div className="grid gap-2 rounded-md border border-border p-3 bg-muted/10">
                                        <Label htmlFor="quickNote">Quick add note</Label>
                                        <Textarea
                                            id="quickNote"
                                            value={noteDraft}
                                            onChange={(e) => setNoteDraft(e.target.value)}
                                            className="min-h-[70px]"
                                            placeholder="Call notes, objections, next step..."
                                        />
                                        <Button
                                            size="sm"
                                            onClick={() => void addNote()}
                                            disabled={saving === `note:${selectedLead.id}` || !noteDraft.trim()}
                                        >
                                            {saving === `note:${selectedLead.id}` ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <MessageSquare className="h-4 w-4 mr-2" />
                                            )}
                                            Add note
                                        </Button>
                                    </div>

                                    {selectedLead.source === "CHATBOT" && selectedLead.chatbotSessionId ? (
                                        <div className="rounded-md border border-border p-3 bg-muted/10 text-sm">
                                            <div className="font-medium">Chatbot conversation</div>
                                            <div className="text-muted-foreground text-xs">{selectedLead.chatbotLogCount} message log(s)</div>
                                            <Button asChild variant="link" className="px-0 h-auto text-sm">
                                                <Link href={`/admin/chatbot/logs?sessionId=${encodeURIComponent(selectedLead.chatbotSessionId)}`}>
                                                    View chatbot log session
                                                </Link>
                                            </Button>
                                        </div>
                                    ) : null}

                                    {selectedLead.source === "EMPLOYER_INQUIRY" && selectedLead.employerInquiry ? (
                                        <div className="rounded-md border border-border p-3 bg-muted/10 space-y-1 text-sm">
                                            <div className="font-medium flex items-center gap-2">
                                                <Building2 className="h-4 w-4" />
                                                Employer inquiry details
                                            </div>
                                            <div className="text-muted-foreground">Company: {selectedLead.employerInquiry.companyName}</div>
                                            <div className="text-muted-foreground">
                                                Employees: {selectedLead.employerInquiry.employeeCountRange || selectedLead.employerInquiry.employeeCount || "(not provided)"}
                                            </div>
                                            <div className="text-muted-foreground">Inquiry status: {selectedLead.employerInquiry.status}</div>
                                            {selectedLead.employerInquiry.message ? (
                                                <div className="text-muted-foreground whitespace-pre-wrap text-xs border border-border rounded p-2 bg-background">
                                                    {selectedLead.employerInquiry.message}
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    <div className="rounded-md border border-border p-3 bg-muted/10">
                                        <div className="text-sm font-medium mb-2">Activity timeline</div>
                                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                            {selectedLead.activities.length ? (
                                                selectedLead.activities.map((activity) => (
                                                    <div key={activity.id} className="text-xs border border-border rounded p-2 bg-background">
                                                        <div className="font-medium">
                                                            {activity.type}
                                                            {activity.fromStatus || activity.toStatus
                                                                ? `: ${activity.fromStatus || "-"} -> ${activity.toStatus || "-"}`
                                                                : ""}
                                                        </div>
                                                        {activity.note ? (
                                                            <div className="text-muted-foreground whitespace-pre-wrap mt-1">{activity.note}</div>
                                                        ) : null}
                                                        <div className="text-muted-foreground mt-1">
                                                            {formatDate(activity.createdAt)}
                                                            {activity.createdByUser?.email ? ` • ${activity.createdByUser.email}` : ""}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-xs text-muted-foreground">No timeline events yet.</div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-lg">Lead source mix</CardTitle>
                            <CardDescription>Current month</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {metricsLoading ? (
                                <div className="text-sm text-muted-foreground">Loading...</div>
                            ) : metrics?.bySource.thisMonth.length ? (
                                metrics.bySource.thisMonth.map((row) => (
                                    <div key={row.source} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span>{row.label}</span>
                                            <span>{row.count}</span>
                                        </div>
                                        <div className="h-2 rounded bg-muted overflow-hidden">
                                            <div
                                                className="h-full bg-primary"
                                                style={{ width: `${clampPercent((row.count / sourceMax) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-muted-foreground">No data for selected filters.</div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle className="text-lg">Monthly revenue projection</CardTitle>
                        <CardDescription>MRR and annual run-rate goal tracking</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {metricsLoading ? (
                            <div className="text-sm text-muted-foreground">Loading revenue metrics...</div>
                        ) : metrics ? (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-md border border-border p-3">
                                        <div className="text-xs text-muted-foreground">Current MRR</div>
                                        <div className="text-xl font-semibold">{formatCurrency(metrics.totals.currentMRR)}</div>
                                    </div>
                                    <div className="rounded-md border border-border p-3">
                                        <div className="text-xs text-muted-foreground">Projected next month MRR</div>
                                        <div className="text-xl font-semibold">{formatCurrency(metrics.mrr.projectedNextMonthMrr)}</div>
                                    </div>
                                    <div className="rounded-md border border-border p-3">
                                        <div className="text-xs text-muted-foreground">Annual run rate</div>
                                        <div className="text-xl font-semibold">{formatCurrency(metrics.totals.annualRunRate)}</div>
                                    </div>
                                    <div className="rounded-md border border-border p-3">
                                        <div className="text-xs text-muted-foreground">Expected next-month enrollments</div>
                                        <div className="text-xl font-semibold">{metrics.mrr.expectedNextMonthEnrollments}</div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-sm font-medium">ARR progress to $250k goal</div>
                                    <div className="h-3 rounded bg-muted overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-600"
                                            style={{ width: `${clampPercent(metrics.goals.arrProgress * 100)}%` }}
                                        />
                                    </div>
                                    <div className="text-xs text-muted-foreground">{formatPercent(metrics.goals.arrProgress)} of target</div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-sm font-medium">Provider #2 threshold ({metrics.goals.providerTwoMinMembers}-{metrics.goals.providerTwoMaxMembers} members)</div>
                                    <div className="h-3 rounded bg-muted overflow-hidden">
                                        <div
                                            className="h-full bg-sky-600"
                                            style={{ width: `${clampPercent(metrics.goals.providerTwoProgressToMax * 100)}%` }}
                                        />
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {metrics.totals.enrolledCount} enrolled members • {formatPercent(metrics.goals.providerTwoProgressToMin)} to minimum threshold
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-sm font-medium">MRR over time</div>
                                    {metrics.mrr.overTime.length ? (
                                        metrics.mrr.overTime.map((row) => (
                                            <div key={row.key} className="flex items-center justify-between text-xs border-b border-border py-1">
                                                <span>{row.label}</span>
                                                <span className="text-muted-foreground">
                                                    +{formatCurrency(row.monthAddedMrr)} (cumulative {formatCurrency(row.cumulativeMrr)})
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-xs text-muted-foreground">No enrolled-membership history yet.</div>
                                    )}
                                </div>
                            </>
                        ) : null}
                    </CardContent>
                </Card>

                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle className="text-lg">Leads by state (this month)</CardTitle>
                        <CardDescription>Top states by lead volume</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {metricsLoading ? (
                            <div className="text-sm text-muted-foreground">Loading state metrics...</div>
                        ) : metrics?.leadsByState.length ? (
                            metrics.leadsByState.map((row) => (
                                <div key={row.state} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span>{row.state}</span>
                                        <span>{row.count}</span>
                                    </div>
                                    <div className="h-2 rounded bg-muted overflow-hidden">
                                        <div
                                            className="h-full bg-sky-600"
                                            style={{ width: `${clampPercent((row.count / stateMax) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-muted-foreground">No state data for selected filters.</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    AlertTriangle,
    ClipboardCopy,
    Loader2,
    Plus,
    RefreshCw,
    Sparkles,
    Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type ProspectSource = "MANUAL" | "INBOUND" | "AI_RESEARCHED";
type ProspectStatus =
    | "PROSPECT"
    | "CONTACTED"
    | "MEETING_SCHEDULED"
    | "PROPOSAL_SENT"
    | "NEGOTIATING"
    | "WON"
    | "LOST";

type Prospect = {
    id: string;
    companyName: string;
    industry: string | null;
    estimatedEmployees: number | null;
    locationState: string | null;
    contactName: string | null;
    contactEmail: string | null;
    contactTitle: string | null;
    source: ProspectSource;
    status: ProspectStatus;
    lastContactDate: string | null;
    nextFollowUpDate: string | null;
    notes: string | null;
    dealValueEstimate: number | null;
    createdAt: string;
    updatedAt: string;
};

type ConversionStage = {
    from: ProspectStatus;
    to: ProspectStatus;
    fromLabel: string;
    toLabel: string;
    fromCount: number;
    toCount: number;
    rate: number;
};

type Dashboard = {
    generatedAt: string;
    totals: {
        totalProspects: number;
        activeProspects: number;
        pipelineValue: number;
        wonThisQuarter: number;
        dueFollowUps: number;
        overallWinRate: number;
    };
    stageCounts: Array<{ status: ProspectStatus; label: string; count: number }>;
    conversionByStage: ConversionStage[];
    reminders: Prospect[];
};

type OutreachTemplateKind =
    | "COLD_OUTREACH"
    | "WARM_OUTREACH"
    | "NO_RESPONSE_FOLLOW_UP"
    | "PROPOSAL_FOLLOW_UP"
    | "CUSTOM";

type OutreachTemplate = {
    id: string;
    name: string;
    kind: OutreachTemplateKind;
    description?: string;
    subject: string;
    body: string;
    updatedAt?: string;
};

type EmailDraft = {
    subject: string;
    body: string;
    provider: string;
    model: string;
    templateId: string;
};

const STATUS_OPTIONS: Array<{ value: ProspectStatus | "ALL"; label: string; stageLabel: string }> = [
    { value: "ALL", label: "All", stageLabel: "All" },
    { value: "PROSPECT", label: "Prospect", stageLabel: "Prospect" },
    { value: "CONTACTED", label: "Contacted", stageLabel: "Contacted" },
    { value: "MEETING_SCHEDULED", label: "Meeting Scheduled", stageLabel: "Meeting" },
    { value: "PROPOSAL_SENT", label: "Proposal Sent", stageLabel: "Proposal" },
    { value: "NEGOTIATING", label: "Negotiating", stageLabel: "Negotiating" },
    { value: "WON", label: "Won", stageLabel: "Won" },
    { value: "LOST", label: "Lost", stageLabel: "Lost" },
];

const SOURCE_OPTIONS: Array<{ value: ProspectSource | "ALL"; label: string }> = [
    { value: "ALL", label: "All sources" },
    { value: "MANUAL", label: "Manual" },
    { value: "INBOUND", label: "Inbound" },
    { value: "AI_RESEARCHED", label: "AI researched" },
];

const KANBAN_ORDER: ProspectStatus[] = [
    "PROSPECT",
    "CONTACTED",
    "MEETING_SCHEDULED",
    "PROPOSAL_SENT",
    "NEGOTIATING",
    "WON",
    "LOST",
];

function statusLabel(status: ProspectStatus) {
    return STATUS_OPTIONS.find((x) => x.value === status)?.label || status;
}

function sourceLabel(source: ProspectSource) {
    return SOURCE_OPTIONS.find((x) => x.value === source)?.label || source;
}

function statusBadge(status: ProspectStatus) {
    if (status === "WON") return <Badge className="bg-emerald-600">Won</Badge>;
    if (status === "LOST") return <Badge variant="outline">Lost</Badge>;
    if (status === "NEGOTIATING") return <Badge className="bg-amber-600">Negotiating</Badge>;
    if (status === "PROPOSAL_SENT") return <Badge className="bg-sky-600">Proposal Sent</Badge>;
    if (status === "MEETING_SCHEDULED") return <Badge className="bg-indigo-600">Meeting</Badge>;
    if (status === "CONTACTED") return <Badge variant="secondary">Contacted</Badge>;
    return <Badge variant="secondary">Prospect</Badge>;
}

function formatDate(value: string | null | undefined) {
    if (!value) return "-";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "-";
    return date.toLocaleDateString();
}

function formatDateTime(value: string | null | undefined) {
    if (!value) return "-";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "-";
    return date.toLocaleString();
}

function toDateInput(value: string | null | undefined) {
    if (!value) return "";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
}

function formatCurrency(value: number | null | undefined) {
    const amount = typeof value === "number" ? value : 0;
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatPercent(value: number | null | undefined) {
    if (!Number.isFinite(value as number)) return "0.0%";
    return `${((value as number) * 100).toFixed(1)}%`;
}

function computeSavingsEstimate(employees: number | null | undefined) {
    if (!employees || !Number.isFinite(employees) || employees <= 0) return 0;
    const dpcAnnual = employees * 89 * 12;
    const traditionalAnnual = employees * (650 * 12 + 2000);
    return Math.max(0, Math.round(traditionalAnnual - dpcAnnual));
}

function buildProposalPath(prospect: Prospect | null | undefined) {
    if (!prospect) return "/for-employers";
    const params = new URLSearchParams();
    if (prospect.companyName) params.set("company", prospect.companyName);
    if (prospect.estimatedEmployees && prospect.estimatedEmployees > 0) {
        params.set("employees", String(Math.trunc(prospect.estimatedEmployees)));
    }
    const query = params.toString();
    return query ? `/for-employers?${query}` : "/for-employers";
}

export function EmployerOutreachCrm() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [savingProspect, setSavingProspect] = useState(false);
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [draftingEmail, setDraftingEmail] = useState(false);
    const [importingCsv, setImportingCsv] = useState(false);
    const [deletingProspectId, setDeletingProspectId] = useState<string | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [dashboard, setDashboard] = useState<Dashboard | null>(null);
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [totalProspects, setTotalProspects] = useState(0);

    const [filters, setFilters] = useState({
        q: "",
        status: "ALL" as ProspectStatus | "ALL",
        source: "ALL" as ProspectSource | "ALL",
        state: "",
        dueOnly: false,
    });

    const [newProspect, setNewProspect] = useState({
        companyName: "",
        industry: "",
        estimatedEmployees: "",
        locationState: "",
        contactName: "",
        contactEmail: "",
        contactTitle: "",
        source: "MANUAL" as ProspectSource,
        status: "PROSPECT" as ProspectStatus,
        nextFollowUpDate: "",
        notes: "",
    });

    const [csvText, setCsvText] = useState("");

    const [selectedProspectId, setSelectedProspectId] = useState("");
    const selectedProspect = useMemo(
        () => prospects.find((prospect) => prospect.id === selectedProspectId) || null,
        [prospects, selectedProspectId]
    );

    const [prospectForm, setProspectForm] = useState({
        companyName: "",
        industry: "",
        estimatedEmployees: "",
        locationState: "",
        contactName: "",
        contactEmail: "",
        contactTitle: "",
        source: "MANUAL" as ProspectSource,
        status: "PROSPECT" as ProspectStatus,
        lastContactDate: "",
        nextFollowUpDate: "",
        notes: "",
        dealValueEstimate: "",
    });

    const [templates, setTemplates] = useState<OutreachTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const selectedTemplate = useMemo(
        () => templates.find((template) => template.id === selectedTemplateId) || null,
        [templates, selectedTemplateId]
    );

    const [draftInputs, setDraftInputs] = useState({
        prospectId: "",
        templateId: "",
        companyName: "",
        contactName: "",
        estimatedEmployees: "",
        context: "",
    });
    const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);

    const groupedByStatus = useMemo(() => {
        const map = new Map<ProspectStatus, Prospect[]>();
        for (const status of KANBAN_ORDER) map.set(status, []);
        for (const prospect of prospects) {
            const list = map.get(prospect.status);
            if (list) list.push(prospect);
        }
        return map;
    }, [prospects]);

    const uniqueStates = useMemo(() => {
        const values = new Set<string>();
        for (const prospect of prospects) {
            if (prospect.locationState) values.add(prospect.locationState);
        }
        return Array.from(values).sort((a, b) => a.localeCompare(b));
    }, [prospects]);

    function applyProspectToForm(prospect: Prospect) {
        setSelectedProspectId(prospect.id);
        setProspectForm({
            companyName: prospect.companyName || "",
            industry: prospect.industry || "",
            estimatedEmployees:
                prospect.estimatedEmployees !== null && prospect.estimatedEmployees !== undefined
                    ? String(prospect.estimatedEmployees)
                    : "",
            locationState: prospect.locationState || "",
            contactName: prospect.contactName || "",
            contactEmail: prospect.contactEmail || "",
            contactTitle: prospect.contactTitle || "",
            source: prospect.source,
            status: prospect.status,
            lastContactDate: toDateInput(prospect.lastContactDate),
            nextFollowUpDate: toDateInput(prospect.nextFollowUpDate),
            notes: prospect.notes || "",
            dealValueEstimate:
                prospect.dealValueEstimate !== null && prospect.dealValueEstimate !== undefined
                    ? String(prospect.dealValueEstimate)
                    : "",
        });
    }

    function applyProspectToDraftInputs(prospect: Prospect) {
        setDraftInputs((prev) => ({
            ...prev,
            prospectId: prospect.id,
            companyName: prospect.companyName || "",
            contactName: prospect.contactName || "",
            estimatedEmployees:
                prospect.estimatedEmployees !== null && prospect.estimatedEmployees !== undefined
                    ? String(prospect.estimatedEmployees)
                    : "",
        }));
    }

    async function copyText(text: string) {
        const value = String(text || "").trim();
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setMessage("Copied to clipboard.");
        } catch {
            setError("Clipboard copy failed in this browser context.");
        }
    }

    async function copyProposalLink(prospect: Prospect) {
        const path = buildProposalPath(prospect);
        if (typeof window === "undefined") return;
        const url = new URL(path, window.location.origin).toString();
        await copyText(url);
    }

    async function loadProspects() {
        const params = new URLSearchParams();
        if (filters.q.trim()) params.set("q", filters.q.trim());
        if (filters.status !== "ALL") params.set("status", filters.status);
        if (filters.source !== "ALL") params.set("source", filters.source);
        if (filters.state.trim()) params.set("state", filters.state.trim());
        if (filters.dueOnly) params.set("due", "1");
        params.set("page", "1");
        params.set("pageSize", "500");

        const res = await fetch(`/api/admin/employers/crm/prospects?${params.toString()}`, {
            cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
            throw new Error(data?.error || "Failed to load prospects");
        }

        setProspects(Array.isArray(data.prospects) ? (data.prospects as Prospect[]) : []);
        setTotalProspects(typeof data.total === "number" ? data.total : 0);
    }

    async function loadDashboard() {
        const res = await fetch("/api/admin/employers/crm/dashboard", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
            throw new Error(data?.error || "Failed to load dashboard");
        }

        setDashboard((data.dashboard || null) as Dashboard | null);
    }

    async function loadTemplates() {
        const res = await fetch("/api/admin/employers/crm/templates", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
            throw new Error(data?.error || "Failed to load outreach templates");
        }

        const nextTemplates = Array.isArray(data.templates) ? (data.templates as OutreachTemplate[]) : [];
        setTemplates(nextTemplates);

        if (!selectedTemplateId && nextTemplates[0]) {
            setSelectedTemplateId(nextTemplates[0].id);
            setDraftInputs((prev) => ({ ...prev, templateId: nextTemplates[0].id }));
        }
    }

    async function loadAll() {
        setLoading(true);
        setError(null);

        try {
            await Promise.all([loadProspects(), loadDashboard(), loadTemplates()]);
        } catch (e: any) {
            setError(e?.message || "Failed to load employer outreach CRM");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const handle = setTimeout(() => {
            void loadProspects().catch((e: any) => {
                setError(e?.message || "Failed to refresh prospects");
            });
        }, 320);

        return () => clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    async function refreshAll() {
        setRefreshing(true);
        setMessage(null);

        try {
            await Promise.all([loadProspects(), loadDashboard(), loadTemplates()]);
        } catch (e: any) {
            setError(e?.message || "Failed to refresh CRM");
        } finally {
            setRefreshing(false);
        }
    }

    async function createProspect() {
        if (!newProspect.companyName.trim()) {
            setError("Company name is required.");
            return;
        }

        setSavingProspect(true);
        setError(null);
        setMessage(null);

        try {
            const payload = {
                companyName: newProspect.companyName,
                industry: newProspect.industry || null,
                estimatedEmployees: newProspect.estimatedEmployees || null,
                locationState: newProspect.locationState || null,
                contactName: newProspect.contactName || null,
                contactEmail: newProspect.contactEmail || null,
                contactTitle: newProspect.contactTitle || null,
                source: newProspect.source,
                status: newProspect.status,
                nextFollowUpDate: newProspect.nextFollowUpDate || null,
                notes: newProspect.notes || null,
            };

            const res = await fetch("/api/admin/employers/crm/prospects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to create prospect");
            }

            const prospect = data.prospect as Prospect;
            setProspects((prev) => [prospect, ...prev]);
            setTotalProspects((prev) => prev + 1);
            applyProspectToForm(prospect);
            applyProspectToDraftInputs(prospect);

            setNewProspect({
                companyName: "",
                industry: "",
                estimatedEmployees: "",
                locationState: "",
                contactName: "",
                contactEmail: "",
                contactTitle: "",
                source: "MANUAL",
                status: "PROSPECT",
                nextFollowUpDate: "",
                notes: "",
            });

            setMessage("Prospect added.");
            await loadDashboard();
        } catch (e: any) {
            setError(e?.message || "Failed to create prospect");
        } finally {
            setSavingProspect(false);
        }
    }

    async function updateProspect(id: string, patch: Record<string, unknown>, successMessage?: string) {
        setSavingProspect(true);
        setError(null);

        try {
            const res = await fetch(`/api/admin/employers/crm/prospects/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patch),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to update prospect");
            }

            const prospect = data.prospect as Prospect;
            setProspects((prev) => prev.map((item) => (item.id === prospect.id ? prospect : item)));
            if (selectedProspectId === prospect.id) {
                applyProspectToForm(prospect);
            }

            if (successMessage) setMessage(successMessage);
            await loadDashboard();
        } catch (e: any) {
            setError(e?.message || "Failed to update prospect");
        } finally {
            setSavingProspect(false);
        }
    }

    async function saveProspectForm() {
        if (!selectedProspect) {
            setError("Select a prospect first.");
            return;
        }
        if (!prospectForm.companyName.trim()) {
            setError("Company name is required.");
            return;
        }

        await updateProspect(
            selectedProspect.id,
            {
                companyName: prospectForm.companyName,
                industry: prospectForm.industry || null,
                estimatedEmployees: prospectForm.estimatedEmployees || null,
                locationState: prospectForm.locationState || null,
                contactName: prospectForm.contactName || null,
                contactEmail: prospectForm.contactEmail || null,
                contactTitle: prospectForm.contactTitle || null,
                source: prospectForm.source,
                status: prospectForm.status,
                lastContactDate: prospectForm.lastContactDate || null,
                nextFollowUpDate: prospectForm.nextFollowUpDate || null,
                notes: prospectForm.notes || null,
                dealValueEstimate: prospectForm.dealValueEstimate || null,
            },
            "Prospect updated."
        );
    }

    async function deleteSelectedProspect() {
        if (!selectedProspect) {
            setError("Select a prospect first.");
            return;
        }

        if (!confirm(`Delete ${selectedProspect.companyName}? This cannot be undone.`)) {
            return;
        }

        setDeletingProspectId(selectedProspect.id);
        setError(null);
        setMessage(null);

        try {
            const res = await fetch(`/api/admin/employers/crm/prospects/${selectedProspect.id}`, {
                method: "DELETE",
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to delete prospect");
            }

            setProspects((prev) => prev.filter((item) => item.id !== selectedProspect.id));
            setTotalProspects((prev) => Math.max(0, prev - 1));
            setSelectedProspectId("");
            setProspectForm({
                companyName: "",
                industry: "",
                estimatedEmployees: "",
                locationState: "",
                contactName: "",
                contactEmail: "",
                contactTitle: "",
                source: "MANUAL",
                status: "PROSPECT",
                lastContactDate: "",
                nextFollowUpDate: "",
                notes: "",
                dealValueEstimate: "",
            });
            setMessage("Prospect deleted.");
            await loadDashboard();
        } catch (e: any) {
            setError(e?.message || "Failed to delete prospect");
        } finally {
            setDeletingProspectId(null);
        }
    }

    async function importCsv() {
        if (!csvText.trim()) {
            setError("Paste CSV text first.");
            return;
        }

        setImportingCsv(true);
        setError(null);
        setMessage(null);

        try {
            const res = await fetch("/api/admin/employers/crm/prospects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "BULK_IMPORT_CSV",
                    csvText,
                    defaultSource: "MANUAL",
                }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to import CSV");
            }

            const createdCount = Number(data.createdCount || 0);
            const errors: string[] = Array.isArray(data.errors) ? data.errors : [];
            setMessage(
                errors.length
                    ? `Imported ${createdCount} prospects with ${errors.length} row warnings.`
                    : `Imported ${createdCount} prospects.`
            );
            if (errors.length) {
                setError(errors.slice(0, 5).join("\n"));
            }
            setCsvText("");
            await refreshAll();
        } catch (e: any) {
            setError(e?.message || "Failed to import CSV");
        } finally {
            setImportingCsv(false);
        }
    }

    async function onCsvFileSelected(file: File | null) {
        if (!file) return;
        try {
            const text = await file.text();
            setCsvText(text);
        } catch {
            setError("Failed to read CSV file.");
        }
    }

    async function saveTemplates() {
        setSavingTemplate(true);
        setError(null);
        setMessage(null);

        try {
            const res = await fetch("/api/admin/employers/crm/templates", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ templates }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to save templates");
            }

            const nextTemplates = Array.isArray(data.templates) ? (data.templates as OutreachTemplate[]) : [];
            setTemplates(nextTemplates);
            if (!selectedTemplateId && nextTemplates[0]) {
                setSelectedTemplateId(nextTemplates[0].id);
            }

            setMessage("Outreach templates saved.");
        } catch (e: any) {
            setError(e?.message || "Failed to save templates");
        } finally {
            setSavingTemplate(false);
        }
    }

    async function generateDraftEmail() {
        if (!draftInputs.companyName.trim() && !draftInputs.prospectId) {
            setError("Select a prospect or provide company name.");
            return;
        }

        setDraftingEmail(true);
        setError(null);
        setMessage(null);

        try {
            const res = await fetch("/api/admin/employers/crm/draft-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prospectId: draftInputs.prospectId || null,
                    templateId: draftInputs.templateId || selectedTemplateId || null,
                    companyName: draftInputs.companyName || null,
                    contactName: draftInputs.contactName || null,
                    estimatedEmployees: draftInputs.estimatedEmployees || null,
                    context: draftInputs.context || null,
                }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to generate outreach draft");
            }

            const draft = data.draft;
            setEmailDraft({
                subject: String(draft?.subject || ""),
                body: String(draft?.body || ""),
                provider: String(draft?.provider || "template"),
                model: String(draft?.model || ""),
                templateId: String(draft?.template?.id || draftInputs.templateId || selectedTemplateId || ""),
            });
            setMessage(
                `Outreach draft generated via ${String(draft?.provider || "template")}${
                    draft?.model ? ` (${String(draft.model)})` : ""
                }.`
            );
        } catch (e: any) {
            setError(e?.message || "Failed to generate outreach draft");
        } finally {
            setDraftingEmail(false);
        }
    }

    function patchTemplate(templateId: string, patch: Partial<OutreachTemplate>) {
        setTemplates((prev) => prev.map((template) => (template.id === templateId ? { ...template, ...patch } : template)));
    }

    function addTemplate() {
        const next: OutreachTemplate = {
            id: `custom-${Date.now()}`,
            name: "Custom template",
            kind: "CUSTOM",
            description: "",
            subject: "Quick note for {company_name}",
            body: "Hi {contact_name},\n\nI wanted to follow up regarding DPC options for {company_name}.\n\nBest,\nPresent Health",
            updatedAt: new Date().toISOString(),
        };
        setTemplates((prev) => [next, ...prev]);
        setSelectedTemplateId(next.id);
        setDraftInputs((prev) => ({ ...prev, templateId: next.id }));
    }

    function removeTemplate(templateId: string) {
        if (!confirm("Remove this template?")) return;
        setTemplates((prev) => prev.filter((template) => template.id !== templateId));
        if (selectedTemplateId === templateId) {
            const fallback = templates.find((template) => template.id !== templateId);
            setSelectedTemplateId(fallback?.id || "");
        }
    }

    const selectedTemplateMergePreview = useMemo(() => {
        const template = selectedTemplate;
        if (!template) return { subject: "", body: "" };

        const employeeCount = Number.parseInt(draftInputs.estimatedEmployees || "0", 10);
        const savings = computeSavingsEstimate(employeeCount || selectedProspect?.estimatedEmployees || 0);

        const mergeFields = {
            company_name: draftInputs.companyName || selectedProspect?.companyName || "your company",
            contact_name: draftInputs.contactName || selectedProspect?.contactName || "there",
            employee_count: employeeCount > 0 ? String(employeeCount) : "your team",
            estimated_annual_savings: formatCurrency(savings),
        };

        const replace = (text: string) =>
            text
                .replaceAll("{company_name}", mergeFields.company_name)
                .replaceAll("{contact_name}", mergeFields.contact_name)
                .replaceAll("{employee_count}", mergeFields.employee_count)
                .replaceAll("{estimated_annual_savings}", mergeFields.estimated_annual_savings);

        return {
            subject: replace(template.subject),
            body: replace(template.body),
        };
    }, [selectedTemplate, draftInputs.companyName, draftInputs.contactName, draftInputs.estimatedEmployees, selectedProspect]);

    if (loading) {
        return (
            <div className="flex justify-center p-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Employer Outreach CRM</h1>
                    <p className="text-sm text-muted-foreground">
                        Lightweight marketing CRM for tracking employer outreach, pipeline, and follow-ups.
                    </p>
                </div>
                <Button variant="outline" onClick={() => void refreshAll()} disabled={refreshing}>
                    {refreshing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh
                </Button>
            </div>

            {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 whitespace-pre-wrap">
                    {error}
                </div>
            ) : null}
            {message ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    {message}
                </div>
            ) : null}

            {dashboard ? (
                <>
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Pipeline Value</CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-semibold">
                                {formatCurrency(dashboard.totals.pipelineValue)}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Won This Quarter</CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-semibold">{dashboard.totals.wonThisQuarter}</CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Overall Win Rate</CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-semibold">
                                {formatPercent(dashboard.totals.overallWinRate)}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Follow-up Due</CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-semibold">
                                {dashboard.totals.dueFollowUps}
                            </CardContent>
                        </Card>
                    </div>

                    {dashboard.reminders.length ? (
                        <Card className="border-amber-300/60">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-amber-700" />
                                    Follow-up Reminders
                                </CardTitle>
                                <CardDescription>
                                    Next follow-up date is today or past due for these active prospects.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-3 md:grid-cols-2">
                                    {dashboard.reminders.slice(0, 8).map((prospect) => (
                                        <div key={prospect.id} className="rounded-lg border p-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="font-medium truncate">{prospect.companyName}</div>
                                                {statusBadge(prospect.status)}
                                            </div>
                                            <div className="mt-1 text-xs text-muted-foreground">
                                                Follow up by: {formatDate(prospect.nextFollowUpDate)}
                                            </div>
                                            <div className="mt-2 flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => applyProspectToForm(prospect)}
                                                >
                                                    Open
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => applyProspectToDraftInputs(prospect)}
                                                >
                                                    Draft Email
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}
                </>
            ) : null}

            <Tabs defaultValue="pipeline" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
                    <TabsTrigger value="prospects">Prospects</TabsTrigger>
                    <TabsTrigger value="outreach">Outreach</TabsTrigger>
                    <TabsTrigger value="import">Import + Add</TabsTrigger>
                </TabsList>

                <TabsContent value="pipeline" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Kanban Pipeline</CardTitle>
                            <CardDescription>
                                Prospect → Contacted → Meeting → Proposal → Negotiating → Won/Lost
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto pb-2">
                                <div className="flex gap-4 min-w-[1240px]">
                                    {KANBAN_ORDER.map((status) => {
                                        const items = groupedByStatus.get(status) || [];
                                        return (
                                            <div key={status} className="w-[260px] shrink-0 rounded-lg border bg-muted/15">
                                                <div className="border-b px-3 py-2 flex items-center justify-between gap-2">
                                                    <div className="font-medium text-sm">
                                                        {STATUS_OPTIONS.find((option) => option.value === status)?.stageLabel ||
                                                            status}
                                                    </div>
                                                    <Badge variant="secondary">{items.length}</Badge>
                                                </div>
                                                <div className="p-3 space-y-3 max-h-[560px] overflow-y-auto">
                                                    {items.length ? (
                                                        items.map((prospect) => (
                                                            <div
                                                                key={prospect.id}
                                                                className="rounded-md border bg-background p-3 text-sm space-y-2"
                                                            >
                                                                <div className="font-medium truncate">
                                                                    {prospect.companyName}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {prospect.contactName || "(no contact)"}
                                                                    {prospect.estimatedEmployees
                                                                        ? ` • ${prospect.estimatedEmployees} employees`
                                                                        : ""}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    Deal: {formatCurrency(prospect.dealValueEstimate)}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    Follow-up: {formatDate(prospect.nextFollowUpDate)}
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <select
                                                                        value={prospect.status}
                                                                        onChange={(e) =>
                                                                            void updateProspect(
                                                                                prospect.id,
                                                                                { status: e.target.value },
                                                                                `Moved ${prospect.companyName} to ${statusLabel(
                                                                                    e.target.value as ProspectStatus
                                                                                )}.`
                                                                            )
                                                                        }
                                                                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                                                                        disabled={savingProspect}
                                                                    >
                                                                        {STATUS_OPTIONS.filter(
                                                                            (option) => option.value !== "ALL"
                                                                        ).map((option) => (
                                                                            <option key={option.value} value={option.value}>
                                                                                {option.label}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                    <div className="flex items-center gap-2">
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="h-7 text-xs px-2"
                                                                            onClick={() => applyProspectToForm(prospect)}
                                                                        >
                                                                            Edit
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="h-7 text-xs px-2"
                                                                            onClick={() => applyProspectToDraftInputs(prospect)}
                                                                        >
                                                                            Draft
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="h-7 text-xs px-2"
                                                                            asChild
                                                                        >
                                                                            <Link href={buildProposalPath(prospect)} target="_blank">
                                                                                ROI
                                                                            </Link>
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
                                                            No prospects
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {dashboard?.conversionByStage?.length ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Conversion Rate By Stage</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/40 text-left">
                                            <tr>
                                                <th className="px-3 py-2">Stage</th>
                                                <th className="px-3 py-2">Count</th>
                                                <th className="px-3 py-2">Next Stage</th>
                                                <th className="px-3 py-2">Count</th>
                                                <th className="px-3 py-2">Conversion</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dashboard.conversionByStage.map((row) => (
                                                <tr key={`${row.from}-${row.to}`} className="border-t">
                                                    <td className="px-3 py-2">{row.fromLabel}</td>
                                                    <td className="px-3 py-2">{row.fromCount}</td>
                                                    <td className="px-3 py-2">{row.toLabel}</td>
                                                    <td className="px-3 py-2">{row.toCount}</td>
                                                    <td className="px-3 py-2 font-medium">{formatPercent(row.rate)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}
                </TabsContent>

                <TabsContent value="prospects" className="space-y-4">
                    <Card>
                        <CardHeader className="flex-row items-start justify-between gap-4 flex-wrap">
                            <div>
                                <CardTitle>Prospects Table</CardTitle>
                                <CardDescription>{totalProspects} prospects loaded</CardDescription>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Input
                                    value={filters.q}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                                    placeholder="Search company, contact, notes..."
                                    className="w-[240px]"
                                />
                                <select
                                    value={filters.status}
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            status: e.target.value as ProspectStatus | "ALL",
                                        }))
                                    }
                                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    {STATUS_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={filters.source}
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            source: e.target.value as ProspectSource | "ALL",
                                        }))
                                    }
                                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    {SOURCE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={filters.state}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, state: e.target.value }))}
                                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="">All states</option>
                                    {uniqueStates.map((state) => (
                                        <option key={state} value={state}>
                                            {state}
                                        </option>
                                    ))}
                                </select>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={filters.dueOnly}
                                        onChange={(e) =>
                                            setFilters((prev) => ({ ...prev, dueOnly: e.target.checked }))
                                        }
                                    />
                                    Due only
                                </label>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {prospects.length ? (
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/40 text-left">
                                            <tr>
                                                <th className="px-3 py-2">Company</th>
                                                <th className="px-3 py-2">Contact</th>
                                                <th className="px-3 py-2">Source</th>
                                                <th className="px-3 py-2">Status</th>
                                                <th className="px-3 py-2">Employees</th>
                                                <th className="px-3 py-2">Deal Value</th>
                                                <th className="px-3 py-2">Next Follow-up</th>
                                                <th className="px-3 py-2 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {prospects.map((prospect) => (
                                                <tr key={prospect.id} className="border-t">
                                                    <td className="px-3 py-2 align-top">
                                                        <div className="font-medium">{prospect.companyName}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {prospect.industry || "-"}
                                                            {prospect.locationState ? ` • ${prospect.locationState}` : ""}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                                                        <div>{prospect.contactName || "-"}</div>
                                                        <div>{prospect.contactTitle || ""}</div>
                                                        {prospect.contactEmail ? (
                                                            <a
                                                                href={`mailto:${prospect.contactEmail}`}
                                                                className="text-primary hover:underline"
                                                            >
                                                                {prospect.contactEmail}
                                                            </a>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-xs">
                                                        {sourceLabel(prospect.source)}
                                                    </td>
                                                    <td className="px-3 py-2 align-top">{statusBadge(prospect.status)}</td>
                                                    <td className="px-3 py-2 align-top">{prospect.estimatedEmployees ?? "-"}</td>
                                                    <td className="px-3 py-2 align-top font-medium">
                                                        {formatCurrency(prospect.dealValueEstimate)}
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                                                        {formatDate(prospect.nextFollowUpDate)}
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => applyProspectToForm(prospect)}
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => applyProspectToDraftInputs(prospect)}
                                                            >
                                                                Draft
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => void copyProposalLink(prospect)}
                                                            >
                                                                <ClipboardCopy className="h-4 w-4" />
                                                            </Button>
                                                            <Button type="button" variant="outline" size="sm" asChild>
                                                                <Link href={buildProposalPath(prospect)} target="_blank">
                                                                    ROI
                                                                </Link>
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                                    No prospects match current filters.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Prospect Detail Editor</CardTitle>
                            <CardDescription>
                                Select a prospect from the table/kanban to edit full details and update follow-up workflow.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!selectedProspect ? (
                                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                                    Select a prospect to edit.
                                </div>
                            ) : (
                                <>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="grid gap-2 md:col-span-2">
                                            <Label htmlFor="prospectCompany">Company name</Label>
                                            <Input
                                                id="prospectCompany"
                                                value={prospectForm.companyName}
                                                onChange={(e) =>
                                                    setProspectForm((prev) => ({ ...prev, companyName: e.target.value }))
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="prospectIndustry">Industry</Label>
                                            <Input
                                                id="prospectIndustry"
                                                value={prospectForm.industry}
                                                onChange={(e) =>
                                                    setProspectForm((prev) => ({ ...prev, industry: e.target.value }))
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="prospectState">Location state</Label>
                                            <Input
                                                id="prospectState"
                                                value={prospectForm.locationState}
                                                onChange={(e) =>
                                                    setProspectForm((prev) => ({ ...prev, locationState: e.target.value }))
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="prospectEmployees">Estimated employees</Label>
                                            <Input
                                                id="prospectEmployees"
                                                type="number"
                                                min={0}
                                                value={prospectForm.estimatedEmployees}
                                                onChange={(e) =>
                                                    setProspectForm((prev) => ({
                                                        ...prev,
                                                        estimatedEmployees: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="prospectDealValue">Deal value estimate</Label>
                                            <Input
                                                id="prospectDealValue"
                                                type="number"
                                                min={0}
                                                value={prospectForm.dealValueEstimate}
                                                onChange={(e) =>
                                                    setProspectForm((prev) => ({
                                                        ...prev,
                                                        dealValueEstimate: e.target.value,
                                                    }))
                                                }
                                            />
                                            <div className="text-xs text-muted-foreground">
                                                Auto baseline at 89 x employees x 12. You can override.
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="prospectContactName">Contact name</Label>
                                            <Input
                                                id="prospectContactName"
                                                value={prospectForm.contactName}
                                                onChange={(e) =>
                                                    setProspectForm((prev) => ({
                                                        ...prev,
                                                        contactName: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="prospectContactTitle">Contact title</Label>
                                            <Input
                                                id="prospectContactTitle"
                                                value={prospectForm.contactTitle}
                                                onChange={(e) =>
                                                    setProspectForm((prev) => ({
                                                        ...prev,
                                                        contactTitle: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2 md:col-span-2">
                                            <Label htmlFor="prospectContactEmail">Contact email</Label>
                                            <Input
                                                id="prospectContactEmail"
                                                type="email"
                                                value={prospectForm.contactEmail}
                                                onChange={(e) =>
                                                    setProspectForm((prev) => ({
                                                        ...prev,
                                                        contactEmail: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="prospectSource">Source</Label>
                                            <select
                                                id="prospectSource"
                                                value={prospectForm.source}
                                                onChange={(e) =>
                                                    setProspectForm((prev) => ({
                                                        ...prev,
                                                        source: e.target.value as ProspectSource,
                                                    }))
                                                }
                                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                            >
                                                {SOURCE_OPTIONS.filter((option) => option.value !== "ALL").map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="prospectStatus">Status</Label>
                                            <select
                                                id="prospectStatus"
                                                value={prospectForm.status}
                                                onChange={(e) =>
                                                    setProspectForm((prev) => ({
                                                        ...prev,
                                                        status: e.target.value as ProspectStatus,
                                                    }))
                                                }
                                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                            >
                                                {STATUS_OPTIONS.filter((option) => option.value !== "ALL").map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="prospectLastContact">Last contact date</Label>
                                            <Input
                                                id="prospectLastContact"
                                                type="date"
                                                value={prospectForm.lastContactDate}
                                                onChange={(e) =>
                                                    setProspectForm((prev) => ({
                                                        ...prev,
                                                        lastContactDate: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="prospectNextFollowUp">Next follow-up date</Label>
                                            <Input
                                                id="prospectNextFollowUp"
                                                type="date"
                                                value={prospectForm.nextFollowUpDate}
                                                onChange={(e) =>
                                                    setProspectForm((prev) => ({
                                                        ...prev,
                                                        nextFollowUpDate: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2 md:col-span-2">
                                            <Label htmlFor="prospectNotes">Notes</Label>
                                            <Textarea
                                                id="prospectNotes"
                                                rows={5}
                                                value={prospectForm.notes}
                                                onChange={(e) =>
                                                    setProspectForm((prev) => ({ ...prev, notes: e.target.value }))
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Button type="button" onClick={() => void saveProspectForm()} disabled={savingProspect}>
                                            {savingProspect ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : null}
                                            Save Prospect
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                if (selectedProspect) applyProspectToDraftInputs(selectedProspect);
                                            }}
                                        >
                                            Draft Outreach Email
                                        </Button>
                                        <Button type="button" variant="outline" onClick={() => void copyProposalLink(selectedProspect)}>
                                            Copy Proposal Link
                                        </Button>
                                        <Button type="button" variant="outline" asChild>
                                            <Link href={buildProposalPath(selectedProspect)} target="_blank">
                                                Open ROI Proposal Link
                                            </Link>
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="text-red-600"
                                            onClick={() => void deleteSelectedProspect()}
                                            disabled={deletingProspectId === selectedProspect.id}
                                        >
                                            {deletingProspectId === selectedProspect.id ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-4 w-4 mr-2" />
                                            )}
                                            Delete
                                        </Button>
                                    </div>

                                    <div className="text-xs text-muted-foreground">
                                        Last updated: {formatDateTime(selectedProspect.updatedAt)}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="outreach" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Outreach Template Library</CardTitle>
                            <CardDescription>
                                Customize reusable templates with merge fields: {'{company_name}'}, {'{contact_name}'}, {'{employee_count}'}, {'{estimated_annual_savings}'}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                                <div className="space-y-2">
                                    <Button type="button" variant="outline" className="w-full" onClick={addTemplate}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        New Template
                                    </Button>
                                    <div className="rounded-lg border max-h-[420px] overflow-y-auto">
                                        {templates.map((template) => (
                                            <button
                                                key={template.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedTemplateId(template.id);
                                                    setDraftInputs((prev) => ({
                                                        ...prev,
                                                        templateId: template.id,
                                                    }));
                                                }}
                                                className={[
                                                    "w-full px-3 py-2 text-left border-b last:border-b-0",
                                                    selectedTemplateId === template.id
                                                        ? "bg-primary/10"
                                                        : "hover:bg-muted/30",
                                                ].join(" ")}
                                            >
                                                <div className="font-medium text-sm truncate">{template.name}</div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {template.kind.replaceAll("_", " ")}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {!selectedTemplate ? (
                                        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                                            Select a template to edit.
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid gap-3 md:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="templateName">Template name</Label>
                                                    <Input
                                                        id="templateName"
                                                        value={selectedTemplate.name}
                                                        onChange={(e) =>
                                                            patchTemplate(selectedTemplate.id, {
                                                                name: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="templateKind">Template kind</Label>
                                                    <select
                                                        id="templateKind"
                                                        value={selectedTemplate.kind}
                                                        onChange={(e) =>
                                                            patchTemplate(selectedTemplate.id, {
                                                                kind: e.target.value as OutreachTemplateKind,
                                                            })
                                                        }
                                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                                    >
                                                        <option value="COLD_OUTREACH">Cold outreach</option>
                                                        <option value="WARM_OUTREACH">Warm outreach</option>
                                                        <option value="NO_RESPONSE_FOLLOW_UP">No-response follow-up</option>
                                                        <option value="PROPOSAL_FOLLOW_UP">Proposal follow-up</option>
                                                        <option value="CUSTOM">Custom</option>
                                                    </select>
                                                </div>
                                                <div className="grid gap-2 md:col-span-2">
                                                    <Label htmlFor="templateDescription">Description</Label>
                                                    <Input
                                                        id="templateDescription"
                                                        value={selectedTemplate.description || ""}
                                                        onChange={(e) =>
                                                            patchTemplate(selectedTemplate.id, {
                                                                description: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="grid gap-2 md:col-span-2">
                                                    <Label htmlFor="templateSubject">Subject</Label>
                                                    <Input
                                                        id="templateSubject"
                                                        value={selectedTemplate.subject}
                                                        onChange={(e) =>
                                                            patchTemplate(selectedTemplate.id, {
                                                                subject: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="grid gap-2 md:col-span-2">
                                                    <Label htmlFor="templateBody">Body</Label>
                                                    <Textarea
                                                        id="templateBody"
                                                        rows={10}
                                                        value={selectedTemplate.body}
                                                        onChange={(e) =>
                                                            patchTemplate(selectedTemplate.id, {
                                                                body: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Button type="button" onClick={() => void saveTemplates()} disabled={savingTemplate}>
                                                    {savingTemplate ? (
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    ) : null}
                                                    Save Templates
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => removeTemplate(selectedTemplate.id)}
                                                    disabled={templates.length <= 1}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Remove Template
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>LLM Outreach Sequence Drafting</CardTitle>
                            <CardDescription>
                                Draft personalized outreach emails with template + company context. Send manually from your normal email client.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="draftProspect">Prospect (optional)</Label>
                                    <select
                                        id="draftProspect"
                                        value={draftInputs.prospectId}
                                        onChange={(e) => {
                                            const prospectId = e.target.value;
                                            const prospect = prospects.find((item) => item.id === prospectId) || null;
                                            if (prospect) {
                                                setDraftInputs((prev) => ({
                                                    ...prev,
                                                    prospectId,
                                                    companyName: prospect.companyName || "",
                                                    contactName: prospect.contactName || "",
                                                    estimatedEmployees:
                                                        prospect.estimatedEmployees !== null && prospect.estimatedEmployees !== undefined
                                                            ? String(prospect.estimatedEmployees)
                                                            : "",
                                                }));
                                            } else {
                                                setDraftInputs((prev) => ({ ...prev, prospectId: "" }));
                                            }
                                        }}
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        <option value="">(no linked prospect)</option>
                                        {prospects.map((prospect) => (
                                            <option key={prospect.id} value={prospect.id}>
                                                {prospect.companyName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="draftTemplate">Template</Label>
                                    <select
                                        id="draftTemplate"
                                        value={draftInputs.templateId || selectedTemplateId}
                                        onChange={(e) =>
                                            setDraftInputs((prev) => ({ ...prev, templateId: e.target.value }))
                                        }
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        {templates.map((template) => (
                                            <option key={template.id} value={template.id}>
                                                {template.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="draftCompanyName">Company name</Label>
                                    <Input
                                        id="draftCompanyName"
                                        value={draftInputs.companyName}
                                        onChange={(e) =>
                                            setDraftInputs((prev) => ({ ...prev, companyName: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="draftContactName">Contact name</Label>
                                    <Input
                                        id="draftContactName"
                                        value={draftInputs.contactName}
                                        onChange={(e) =>
                                            setDraftInputs((prev) => ({ ...prev, contactName: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="draftEmployees">Employee count</Label>
                                    <Input
                                        id="draftEmployees"
                                        type="number"
                                        min={0}
                                        value={draftInputs.estimatedEmployees}
                                        onChange={(e) =>
                                            setDraftInputs((prev) => ({
                                                ...prev,
                                                estimatedEmployees: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="draftContext">Context for personalization</Label>
                                    <Textarea
                                        id="draftContext"
                                        rows={4}
                                        value={draftInputs.context}
                                        onChange={(e) =>
                                            setDraftInputs((prev) => ({ ...prev, context: e.target.value }))
                                        }
                                        placeholder="Recent announcement, benefits context, pain points, etc."
                                    />
                                </div>
                            </div>

                            <div className="rounded-lg border bg-muted/15 p-3 text-xs text-muted-foreground">
                                <div className="font-medium text-foreground">Merge preview</div>
                                <div className="mt-1">Subject: {selectedTemplateMergePreview.subject || "-"}</div>
                                <div className="mt-1 whitespace-pre-wrap">Body: {selectedTemplateMergePreview.body || "-"}</div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button type="button" onClick={() => void generateDraftEmail()} disabled={draftingEmail}>
                                    {draftingEmail ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Sparkles className="h-4 w-4 mr-2" />
                                    )}
                                    Generate Draft Email
                                </Button>
                            </div>

                            {emailDraft ? (
                                <div className="grid gap-3">
                                    <div className="grid gap-2">
                                        <Label htmlFor="emailDraftSubject">Draft subject</Label>
                                        <Input
                                            id="emailDraftSubject"
                                            value={emailDraft.subject}
                                            onChange={(e) =>
                                                setEmailDraft((prev) =>
                                                    prev ? { ...prev, subject: e.target.value } : prev
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="emailDraftBody">Draft body</Label>
                                        <Textarea
                                            id="emailDraftBody"
                                            rows={12}
                                            value={emailDraft.body}
                                            onChange={(e) =>
                                                setEmailDraft((prev) =>
                                                    prev ? { ...prev, body: e.target.value } : prev
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                void copyText(`Subject: ${emailDraft.subject}\n\n${emailDraft.body}`)
                                            }
                                        >
                                            <ClipboardCopy className="h-4 w-4 mr-2" />
                                            Copy Full Email
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => void copyText(emailDraft.subject)}
                                        >
                                            Copy Subject
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => void copyText(emailDraft.body)}
                                        >
                                            Copy Body
                                        </Button>
                                        <div className="text-xs text-muted-foreground">
                                            Generated by {emailDraft.provider}
                                            {emailDraft.model ? ` (${emailDraft.model})` : ""}
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="import" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Manual Add Prospect</CardTitle>
                            <CardDescription>
                                Add one employer prospect at a time with estimated deal value and follow-up date.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="newCompanyName">Company name</Label>
                                    <Input
                                        id="newCompanyName"
                                        value={newProspect.companyName}
                                        onChange={(e) =>
                                            setNewProspect((prev) => ({ ...prev, companyName: e.target.value }))
                                        }
                                        placeholder="Acme Manufacturing"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="newIndustry">Industry</Label>
                                    <Input
                                        id="newIndustry"
                                        value={newProspect.industry}
                                        onChange={(e) =>
                                            setNewProspect((prev) => ({ ...prev, industry: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="newEmployees">Estimated employees</Label>
                                    <Input
                                        id="newEmployees"
                                        type="number"
                                        min={0}
                                        value={newProspect.estimatedEmployees}
                                        onChange={(e) =>
                                            setNewProspect((prev) => ({
                                                ...prev,
                                                estimatedEmployees: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="newState">Location state</Label>
                                    <Input
                                        id="newState"
                                        value={newProspect.locationState}
                                        onChange={(e) =>
                                            setNewProspect((prev) => ({
                                                ...prev,
                                                locationState: e.target.value,
                                            }))
                                        }
                                        placeholder="TX"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="newSource">Source</Label>
                                    <select
                                        id="newSource"
                                        value={newProspect.source}
                                        onChange={(e) =>
                                            setNewProspect((prev) => ({
                                                ...prev,
                                                source: e.target.value as ProspectSource,
                                            }))
                                        }
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        {SOURCE_OPTIONS.filter((option) => option.value !== "ALL").map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="newContactName">Contact name</Label>
                                    <Input
                                        id="newContactName"
                                        value={newProspect.contactName}
                                        onChange={(e) =>
                                            setNewProspect((prev) => ({
                                                ...prev,
                                                contactName: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="newContactEmail">Contact email</Label>
                                    <Input
                                        id="newContactEmail"
                                        type="email"
                                        value={newProspect.contactEmail}
                                        onChange={(e) =>
                                            setNewProspect((prev) => ({
                                                ...prev,
                                                contactEmail: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="newContactTitle">Contact title</Label>
                                    <Input
                                        id="newContactTitle"
                                        value={newProspect.contactTitle}
                                        onChange={(e) =>
                                            setNewProspect((prev) => ({
                                                ...prev,
                                                contactTitle: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="newStatus">Initial status</Label>
                                    <select
                                        id="newStatus"
                                        value={newProspect.status}
                                        onChange={(e) =>
                                            setNewProspect((prev) => ({
                                                ...prev,
                                                status: e.target.value as ProspectStatus,
                                            }))
                                        }
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        {STATUS_OPTIONS.filter((option) => option.value !== "ALL").map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="newFollowUp">Next follow-up date</Label>
                                    <Input
                                        id="newFollowUp"
                                        type="date"
                                        value={newProspect.nextFollowUpDate}
                                        onChange={(e) =>
                                            setNewProspect((prev) => ({
                                                ...prev,
                                                nextFollowUpDate: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="newNotes">Notes</Label>
                                    <Textarea
                                        id="newNotes"
                                        rows={4}
                                        value={newProspect.notes}
                                        onChange={(e) =>
                                            setNewProspect((prev) => ({ ...prev, notes: e.target.value }))
                                        }
                                    />
                                </div>
                            </div>

                            <div className="text-xs text-muted-foreground">
                                Estimated deal value preview: {formatCurrency(Number(newProspect.estimatedEmployees || 0) * 89 * 12)}
                            </div>

                            <div>
                                <Button type="button" onClick={() => void createProspect()} disabled={savingProspect}>
                                    {savingProspect ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                    Add Prospect
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>CSV Import</CardTitle>
                            <CardDescription>
                                Import prospects from CSV. Header fields supported: company_name, industry, estimated_employees, location_state, contact_name, contact_email, contact_title, source, status, last_contact_date, next_follow_up_date, notes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="csvFile">Upload CSV file</Label>
                                <Input
                                    id="csvFile"
                                    type="file"
                                    accept=".csv,text/csv"
                                    onChange={(e) => void onCsvFileSelected(e.target.files?.[0] || null)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="csvText">Or paste CSV text</Label>
                                <Textarea
                                    id="csvText"
                                    rows={10}
                                    value={csvText}
                                    onChange={(e) => setCsvText(e.target.value)}
                                    placeholder="company_name,industry,estimated_employees,location_state,contact_name,contact_email\nAcme,Manufacturing,120,TX,Jane Doe,jane@acme.com"
                                />
                            </div>
                            <div>
                                <Button type="button" onClick={() => void importCsv()} disabled={importingCsv}>
                                    {importingCsv ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                    Import CSV
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

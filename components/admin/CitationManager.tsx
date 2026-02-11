"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";

import { DEFAULT_ENTITY_SPINE_TEXT } from "@/lib/citations";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type CanonicalNapSettings = {
    businessName: string;
    address: string;
    phone: string;
    websiteUrl: string;
    entityDescription: string;
    updatedAt?: string;
};

type CitationCategory = "CLINICAL" | "BRAND" | "BUSINESS" | "PRESS";
type CitationStatus = "ACTIVE" | "PENDING" | "NEEDS_UPDATE" | "NOT_LISTED";

type Citation = {
    id: string;
    platformName: string;
    platformUrl: string | null;
    listingUrl: string | null;
    category: CitationCategory;
    nameAsListed: string | null;
    addressAsListed: string | null;
    phoneAsListed: string | null;
    websiteAsListed: string | null;
    status: CitationStatus;
    lastVerifiedDate: string | null;
    nextVerificationDate: string | null;
    reminderIntervalDays: number;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
};

type CitationMismatch = {
    field: "nameAsListed" | "addressAsListed" | "phoneAsListed" | "websiteAsListed";
    expected: string;
    actual: string;
};

type CitationAuditRecord = {
    citation: Citation;
    mismatches: CitationMismatch[];
    mismatchFields: CitationMismatch["field"][];
    needsUpdate: boolean;
    shouldCreate: boolean;
    isOverdue: boolean;
    daysUntilReverify: number | null;
};

type CitationAuditSummary = {
    total: number;
    active: number;
    pending: number;
    needsUpdate: number;
    notListed: number;
    overdue: number;
    mismatched: number;
};

const CATEGORY_OPTIONS: Array<{ value: CitationCategory | "ALL"; label: string }> = [
    { value: "ALL", label: "All" },
    { value: "CLINICAL", label: "Clinical" },
    { value: "BRAND", label: "Brand/Social" },
    { value: "BUSINESS", label: "Business" },
    { value: "PRESS", label: "Press" },
];

const STATUS_OPTIONS: Array<{ value: CitationStatus | "ALL"; label: string }> = [
    { value: "ALL", label: "All" },
    { value: "ACTIVE", label: "Active" },
    { value: "PENDING", label: "Pending" },
    { value: "NEEDS_UPDATE", label: "Needs update" },
    { value: "NOT_LISTED", label: "Not listed" },
];

function toInputDate(value: string | null) {
    if (!value) return "";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
}

function formatDate(value: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "-";
    return date.toLocaleDateString();
}

function truncateByWords(text: string, maxChars: number) {
    const cleaned = text.trim().replace(/\s+/g, " ");
    if (cleaned.length <= maxChars) return cleaned;

    const words = cleaned.split(" ");
    let out = "";
    for (const word of words) {
        const next = out ? `${out} ${word}` : word;
        if (next.length > maxChars - 3) break;
        out = next;
    }
    return out ? `${out}...` : `${cleaned.slice(0, Math.max(0, maxChars - 3))}...`;
}

function statusBadge(status: CitationStatus) {
    if (status === "ACTIVE") return <Badge className="bg-emerald-600">Active</Badge>;
    if (status === "PENDING") return <Badge className="bg-amber-600">Pending</Badge>;
    if (status === "NEEDS_UPDATE") return <Badge className="bg-rose-600">Needs update</Badge>;
    return <Badge variant="outline">Not listed</Badge>;
}

export function CitationManager() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [canonical, setCanonical] = useState<CanonicalNapSettings>({
        businessName: "Present Health",
        address: "",
        phone: "",
        websiteUrl: "https://presenthealthmd.com",
        entityDescription: DEFAULT_ENTITY_SPINE_TEXT,
    });
    const [summary, setSummary] = useState<CitationAuditSummary>({
        total: 0,
        active: 0,
        pending: 0,
        needsUpdate: 0,
        notListed: 0,
        overdue: 0,
        mismatched: 0,
    });
    const [records, setRecords] = useState<CitationAuditRecord[]>([]);
    const [citations, setCitations] = useState<Citation[]>([]);

    const [statusFilter, setStatusFilter] = useState<CitationStatus | "ALL">("ALL");
    const [categoryFilter, setCategoryFilter] = useState<CitationCategory | "ALL">("ALL");
    const [query, setQuery] = useState("");

    const [savingCanonical, setSavingCanonical] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const [newCitation, setNewCitation] = useState({
        platformName: "",
        platformUrl: "",
        category: "PRESS" as CitationCategory,
    });
    const [creating, setCreating] = useState(false);

    const recordById = useMemo(() => {
        const map = new Map<string, CitationAuditRecord>();
        for (const record of records) {
            map.set(record.citation.id, record);
        }
        return map;
    }, [records]);

    const filteredCitations = useMemo(() => {
        const q = query.trim().toLowerCase();
        return citations.filter((citation) => {
            if (statusFilter !== "ALL" && citation.status !== statusFilter) return false;
            if (categoryFilter !== "ALL" && citation.category !== categoryFilter) return false;
            if (!q) return true;
            return (
                citation.platformName.toLowerCase().includes(q) ||
                (citation.platformUrl || "").toLowerCase().includes(q) ||
                (citation.listingUrl || "").toLowerCase().includes(q)
            );
        });
    }, [citations, statusFilter, categoryFilter, query]);

    const entitySpineVariants = useMemo(() => {
        const source = canonical.entityDescription || DEFAULT_ENTITY_SPINE_TEXT;
        return [
            { key: "full", label: "Full entity spine", value: source, limit: "No hard limit" },
            {
                key: "social160",
                label: "Social short",
                value: truncateByWords(source, 160),
                limit: "160 characters",
            },
            {
                key: "directory300",
                label: "Directory short",
                value: truncateByWords(source, 300),
                limit: "300 characters",
            },
            {
                key: "press500",
                label: "Press boilerplate",
                value: truncateByWords(source, 500),
                limit: "500 characters",
            },
        ];
    }, [canonical.entityDescription]);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const [auditRes, canonicalRes] = await Promise.all([
                fetch("/api/admin/citations/audit", { cache: "no-store" }),
                fetch("/api/admin/citations/canonical", { cache: "no-store" }),
            ]);

            const auditData = await auditRes.json().catch(() => null);
            const canonicalData = await canonicalRes.json().catch(() => null);

            if (!auditRes.ok || !auditData?.success) {
                throw new Error(auditData?.error || "Failed to load citation audit");
            }
            if (!canonicalRes.ok || !canonicalData?.success) {
                throw new Error(canonicalData?.error || "Failed to load canonical NAP settings");
            }

            const nextRecords = Array.isArray(auditData.records) ? (auditData.records as CitationAuditRecord[]) : [];
            setSummary(auditData.summary || summary);
            setRecords(nextRecords);
            setCitations(nextRecords.map((record) => record.citation));
            setCanonical(canonicalData.canonical as CanonicalNapSettings);
        } catch (e: any) {
            setError(e?.message || "Failed to load citation manager");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function patchCitation(id: string, patch: Partial<Citation>) {
        setCitations((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    }

    async function saveCitation(id: string) {
        const citation = citations.find((x) => x.id === id);
        if (!citation) return;

        setSavingId(id);
        setError(null);
        try {
            const payload = {
                platformName: citation.platformName,
                platformUrl: citation.platformUrl || "",
                listingUrl: citation.listingUrl || "",
                category: citation.category,
                status: citation.status,
                nameAsListed: citation.nameAsListed || "",
                addressAsListed: citation.addressAsListed || "",
                phoneAsListed: citation.phoneAsListed || "",
                websiteAsListed: citation.websiteAsListed || "",
                reminderIntervalDays: citation.reminderIntervalDays,
                lastVerifiedDate: toInputDate(citation.lastVerifiedDate) || null,
                nextVerificationDate: toInputDate(citation.nextVerificationDate) || null,
                notes: citation.notes || "",
            };

            const res = await fetch(`/api/admin/citations/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to save citation");

            await load();
        } catch (e: any) {
            setError(e?.message || "Failed to save citation");
        } finally {
            setSavingId(null);
        }
    }

    async function verifyCitation(id: string) {
        setVerifyingId(id);
        setError(null);
        try {
            const res = await fetch(`/api/admin/citations/${id}/verify`, { method: "POST" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to mark citation verified");
            await load();
        } catch (e: any) {
            setError(e?.message || "Failed to mark citation verified");
        } finally {
            setVerifyingId(null);
        }
    }

    async function createCitation() {
        if (!newCitation.platformName.trim()) {
            setError("Platform name is required");
            return;
        }

        setCreating(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/citations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    platformName: newCitation.platformName,
                    platformUrl: newCitation.platformUrl,
                    category: newCitation.category,
                    status: "NOT_LISTED",
                }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to create citation");

            setNewCitation({ platformName: "", platformUrl: "", category: "PRESS" });
            await load();
        } catch (e: any) {
            setError(e?.message || "Failed to create citation");
        } finally {
            setCreating(false);
        }
    }

    async function saveCanonical() {
        setSavingCanonical(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/citations/canonical", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(canonical),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to save canonical settings");
            setCanonical(data.canonical as CanonicalNapSettings);
            await load();
        } catch (e: any) {
            setError(e?.message || "Failed to save canonical settings");
        } finally {
            setSavingCanonical(false);
        }
    }

    async function copyValue(key: string, value: string) {
        try {
            await navigator.clipboard.writeText(value || "");
            setCopiedKey(key);
            setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1400);
        } catch {
            setError("Copy failed. Your browser may block clipboard access.");
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Citation Manager</h1>
                    <p className="text-sm text-muted-foreground">
                        Track directory listings, keep NAP data consistent, and monitor verification reminders.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => void load()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button asChild variant="outline">
                        <a href="/api/admin/citations/audit?format=csv">
                            <Download className="h-4 w-4 mr-2" />
                            Export inconsistencies
                        </a>
                    </Button>
                </div>
            </div>

            {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-6">
                <Card className="border-border/60 md:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Total listings</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">{summary.total}</CardContent>
                </Card>
                <Card className="border-border/60">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Needs update</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold text-rose-700">{summary.needsUpdate}</CardContent>
                </Card>
                <Card className="border-border/60">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Not listed</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold text-amber-700">{summary.notListed}</CardContent>
                </Card>
                <Card className="border-border/60">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Overdue reminders</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold text-amber-700">{summary.overdue}</CardContent>
                </Card>
                <Card className="border-border/60">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">NAP mismatches</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold text-rose-700">{summary.mismatched}</CardContent>
                </Card>
            </div>

            <Tabs defaultValue="directory" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="directory">Directory</TabsTrigger>
                    <TabsTrigger value="canonical">Canonical NAP</TabsTrigger>
                    <TabsTrigger value="audit">Consistency Audit</TabsTrigger>
                </TabsList>

                <TabsContent value="directory" className="space-y-4">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-lg">Add citation</CardTitle>
                            <CardDescription>Create additional directory targets (for example, press mentions).</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_220px_auto]">
                            <Input
                                value={newCitation.platformName}
                                onChange={(e) => setNewCitation((prev) => ({ ...prev, platformName: e.target.value }))}
                                placeholder="Platform name"
                            />
                            <Input
                                value={newCitation.platformUrl}
                                onChange={(e) => setNewCitation((prev) => ({ ...prev, platformUrl: e.target.value }))}
                                placeholder="Platform URL"
                            />
                            <select
                                value={newCitation.category}
                                onChange={(e) =>
                                    setNewCitation((prev) => ({ ...prev, category: e.target.value as CitationCategory }))
                                }
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                {(["CLINICAL", "BRAND", "BUSINESS", "PRESS"] as CitationCategory[]).map(
                                    (category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    )
                                )}
                            </select>
                            <Button onClick={() => void createCitation()} disabled={creating}>
                                {creating ? "Adding..." : "Add"}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader className="flex-row items-start justify-between gap-4 flex-wrap">
                            <div className="space-y-1">
                                <CardTitle className="text-lg">Citation directory</CardTitle>
                                <CardDescription>{filteredCitations.length} listing(s) shown</CardDescription>
                            </div>
                            <div className="flex items-end gap-3 flex-wrap">
                                <div className="grid gap-1">
                                    <Label htmlFor="statusFilter">Status</Label>
                                    <select
                                        id="statusFilter"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as CitationStatus | "ALL")}
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        {STATUS_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-1">
                                    <Label htmlFor="categoryFilter">Category</Label>
                                    <select
                                        id="categoryFilter"
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value as CitationCategory | "ALL")}
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        {CATEGORY_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-1 min-w-[220px]">
                                    <Label htmlFor="search">Search</Label>
                                    <Input
                                        id="search"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Platform, URL..."
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filteredCitations.length ? (
                                <div className="grid gap-4">
                                    {filteredCitations.map((citation) => {
                                        const record = recordById.get(citation.id);
                                        const mismatchFields = new Set(record?.mismatchFields || []);

                                        return (
                                            <Card key={citation.id} className="border-border/60">
                                                <CardHeader className="flex-row items-start justify-between gap-4 flex-wrap">
                                                    <div className="space-y-2 min-w-0">
                                                        <CardTitle className="text-lg leading-tight">{citation.platformName}</CardTitle>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge variant="outline">{citation.category}</Badge>
                                                            {statusBadge(citation.status)}
                                                            {record?.isOverdue ? <Badge className="bg-amber-600">Reminder overdue</Badge> : null}
                                                            {record?.mismatches.length ? (
                                                                <Badge className="bg-rose-600">NAP mismatch</Badge>
                                                            ) : null}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => void verifyCitation(citation.id)}
                                                            disabled={verifyingId === citation.id}
                                                        >
                                                            {verifyingId === citation.id ? "Marking..." : "Mark verified"}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => void saveCitation(citation.id)}
                                                            disabled={savingId === citation.id}
                                                        >
                                                            {savingId === citation.id ? "Saving..." : "Save"}
                                                        </Button>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="grid gap-3 md:grid-cols-2">
                                                        <div className="grid gap-1">
                                                            <Label>Platform URL</Label>
                                                            <Input
                                                                value={citation.platformUrl || ""}
                                                                onChange={(e) =>
                                                                    patchCitation(citation.id, { platformUrl: e.target.value })
                                                                }
                                                                placeholder="https://..."
                                                            />
                                                        </div>
                                                        <div className="grid gap-1">
                                                            <Label>Listing URL</Label>
                                                            <Input
                                                                value={citation.listingUrl || ""}
                                                                onChange={(e) =>
                                                                    patchCitation(citation.id, { listingUrl: e.target.value })
                                                                }
                                                                placeholder="Public listing URL"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid gap-3 md:grid-cols-4">
                                                        <div className="grid gap-1">
                                                            <Label>Name as listed</Label>
                                                            <Input
                                                                value={citation.nameAsListed || ""}
                                                                onChange={(e) =>
                                                                    patchCitation(citation.id, {
                                                                        nameAsListed: e.target.value,
                                                                    })
                                                                }
                                                                className={
                                                                    mismatchFields.has("nameAsListed")
                                                                        ? "border-rose-300 bg-rose-50"
                                                                        : undefined
                                                                }
                                                            />
                                                        </div>
                                                        <div className="grid gap-1">
                                                            <Label>Address as listed</Label>
                                                            <Input
                                                                value={citation.addressAsListed || ""}
                                                                onChange={(e) =>
                                                                    patchCitation(citation.id, {
                                                                        addressAsListed: e.target.value,
                                                                    })
                                                                }
                                                                className={
                                                                    mismatchFields.has("addressAsListed")
                                                                        ? "border-rose-300 bg-rose-50"
                                                                        : undefined
                                                                }
                                                            />
                                                        </div>
                                                        <div className="grid gap-1">
                                                            <Label>Phone as listed</Label>
                                                            <Input
                                                                value={citation.phoneAsListed || ""}
                                                                onChange={(e) =>
                                                                    patchCitation(citation.id, {
                                                                        phoneAsListed: e.target.value,
                                                                    })
                                                                }
                                                                className={
                                                                    mismatchFields.has("phoneAsListed")
                                                                        ? "border-rose-300 bg-rose-50"
                                                                        : undefined
                                                                }
                                                            />
                                                        </div>
                                                        <div className="grid gap-1">
                                                            <Label>Website as listed</Label>
                                                            <Input
                                                                value={citation.websiteAsListed || ""}
                                                                onChange={(e) =>
                                                                    patchCitation(citation.id, {
                                                                        websiteAsListed: e.target.value,
                                                                    })
                                                                }
                                                                className={
                                                                    mismatchFields.has("websiteAsListed")
                                                                        ? "border-rose-300 bg-rose-50"
                                                                        : undefined
                                                                }
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid gap-3 md:grid-cols-4">
                                                        <div className="grid gap-1">
                                                            <Label>Status</Label>
                                                            <select
                                                                value={citation.status}
                                                                onChange={(e) =>
                                                                    patchCitation(citation.id, {
                                                                        status: e.target.value as CitationStatus,
                                                                    })
                                                                }
                                                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                                            >
                                                                {STATUS_OPTIONS.filter((x) => x.value !== "ALL").map((option) => (
                                                                    <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="grid gap-1">
                                                            <Label>Reminder interval (days)</Label>
                                                            <Input
                                                                type="number"
                                                                min={1}
                                                                max={3650}
                                                                value={citation.reminderIntervalDays}
                                                                onChange={(e) =>
                                                                    patchCitation(citation.id, {
                                                                        reminderIntervalDays:
                                                                            Number.parseInt(e.target.value, 10) || 90,
                                                                    })
                                                                }
                                                            />
                                                        </div>
                                                        <div className="grid gap-1">
                                                            <Label>Last verified</Label>
                                                            <Input
                                                                type="date"
                                                                value={toInputDate(citation.lastVerifiedDate)}
                                                                onChange={(e) =>
                                                                    patchCitation(citation.id, {
                                                                        lastVerifiedDate: e.target.value
                                                                            ? new Date(e.target.value)
                                                                                  .toISOString()
                                                                            : null,
                                                                    })
                                                                }
                                                            />
                                                        </div>
                                                        <div className="grid gap-1">
                                                            <Label>Next re-verify</Label>
                                                            <Input
                                                                type="date"
                                                                value={toInputDate(citation.nextVerificationDate)}
                                                                onChange={(e) =>
                                                                    patchCitation(citation.id, {
                                                                        nextVerificationDate: e.target.value
                                                                            ? new Date(e.target.value)
                                                                                  .toISOString()
                                                                            : null,
                                                                    })
                                                                }
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid gap-1">
                                                        <Label>Notes</Label>
                                                        <Textarea
                                                            value={citation.notes || ""}
                                                            onChange={(e) => patchCitation(citation.id, { notes: e.target.value })}
                                                            rows={2}
                                                        />
                                                    </div>

                                                    <div className="text-xs text-muted-foreground">
                                                        Last verified: {formatDate(citation.lastVerifiedDate)} | Next re-verify: {formatDate(citation.nextVerificationDate)}
                                                        {typeof record?.daysUntilReverify === "number"
                                                            ? ` (${record.daysUntilReverify >= 0 ? `${record.daysUntilReverify} day(s) remaining` : `${Math.abs(record.daysUntilReverify)} day(s) overdue`})`
                                                            : ""}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-md border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                                    No citations match your filters.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="canonical" className="space-y-4">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-lg">Canonical NAP settings</CardTitle>
                            <CardDescription>
                                Define the one correct business profile used for consistency audits.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-1 md:col-span-2">
                                <Label>Business name</Label>
                                <Input
                                    value={canonical.businessName}
                                    onChange={(e) => setCanonical((prev) => ({ ...prev, businessName: e.target.value }))}
                                />
                            </div>

                            <div className="grid gap-1 md:col-span-2">
                                <Label>Address</Label>
                                <Input
                                    value={canonical.address}
                                    onChange={(e) => setCanonical((prev) => ({ ...prev, address: e.target.value }))}
                                />
                            </div>

                            <div className="grid gap-1">
                                <Label>Phone</Label>
                                <Input
                                    value={canonical.phone}
                                    onChange={(e) => setCanonical((prev) => ({ ...prev, phone: e.target.value }))}
                                />
                            </div>

                            <div className="grid gap-1">
                                <Label>Website URL</Label>
                                <Input
                                    value={canonical.websiteUrl}
                                    onChange={(e) => setCanonical((prev) => ({ ...prev, websiteUrl: e.target.value }))}
                                />
                            </div>

                            <div className="grid gap-1 md:col-span-2">
                                <Label>Entity spine description</Label>
                                <Textarea
                                    value={canonical.entityDescription}
                                    onChange={(e) =>
                                        setCanonical((prev) => ({ ...prev, entityDescription: e.target.value }))
                                    }
                                    rows={4}
                                />
                            </div>

                            <div className="md:col-span-2 flex items-center gap-2">
                                <Button onClick={() => void saveCanonical()} disabled={savingCanonical}>
                                    {savingCanonical ? "Saving..." : "Save canonical settings"}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        setCanonical((prev) => ({
                                            ...prev,
                                            entityDescription: DEFAULT_ENTITY_SPINE_TEXT,
                                        }))
                                    }
                                >
                                    Reset entity spine text
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-lg">Entity spine copy tool</CardTitle>
                            <CardDescription>
                                One-click copy for canonical values and character-limited platform variants.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-2">
                                {[
                                    { key: "name", label: "Business name", value: canonical.businessName },
                                    { key: "address", label: "Address", value: canonical.address },
                                    { key: "phone", label: "Phone", value: canonical.phone },
                                    { key: "website", label: "Website", value: canonical.websiteUrl },
                                ].map((item) => (
                                    <div key={item.key} className="rounded-md border border-border p-3">
                                        <div className="text-xs text-muted-foreground">{item.label}</div>
                                        <div className="mt-1 text-sm font-medium break-words">{item.value || "(blank)"}</div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-2"
                                            onClick={() => void copyValue(item.key, item.value)}
                                        >
                                            {copiedKey === item.key ? "Copied" : "Copy"}
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="grid gap-3">
                                {entitySpineVariants.map((variant) => (
                                    <div key={variant.key} className="rounded-md border border-border p-3">
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <div>
                                                <div className="text-sm font-medium text-foreground">{variant.label}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {variant.limit} | {variant.value.length} chars
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => void copyValue(variant.key, variant.value)}
                                            >
                                                {copiedKey === variant.key ? "Copied" : "Copy"}
                                            </Button>
                                        </div>
                                        <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{variant.value}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="audit" className="space-y-4">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-lg">Consistency audit view</CardTitle>
                            <CardDescription>
                                Compare every listing against canonical NAP. Red fields indicate mismatches.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {records.length ? (
                                <div className="grid gap-4">
                                    {records.map((record) => {
                                        const citation = record.citation;
                                        const mismatchFields = new Set(record.mismatchFields);

                                        return (
                                            <Card key={citation.id} className="border-border/60">
                                                <CardHeader className="flex-row items-start justify-between gap-4 flex-wrap">
                                                    <div>
                                                        <CardTitle className="text-lg">{citation.platformName}</CardTitle>
                                                        <div className="mt-1 flex flex-wrap gap-2">
                                                            <Badge variant="outline">{citation.category}</Badge>
                                                            {statusBadge(citation.status)}
                                                            {record.needsUpdate ? (
                                                                <Badge className="bg-rose-600">Needs update</Badge>
                                                            ) : (
                                                                <Badge className="bg-emerald-600">Consistent</Badge>
                                                            )}
                                                            {record.shouldCreate ? (
                                                                <Badge className="bg-amber-600">Listing not created</Badge>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Last verified: {formatDate(citation.lastVerifiedDate)}
                                                        <br />
                                                        Next reminder: {formatDate(citation.nextVerificationDate)}
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-2">
                                                    {([
                                                        {
                                                            key: "nameAsListed",
                                                            label: "Name",
                                                            expected: canonical.businessName,
                                                            actual: citation.nameAsListed || "",
                                                        },
                                                        {
                                                            key: "addressAsListed",
                                                            label: "Address",
                                                            expected: canonical.address,
                                                            actual: citation.addressAsListed || "",
                                                        },
                                                        {
                                                            key: "phoneAsListed",
                                                            label: "Phone",
                                                            expected: canonical.phone,
                                                            actual: citation.phoneAsListed || "",
                                                        },
                                                        {
                                                            key: "websiteAsListed",
                                                            label: "Website",
                                                            expected: canonical.websiteUrl,
                                                            actual: citation.websiteAsListed || "",
                                                        },
                                                    ] as const).map((row) => {
                                                        const mismatched = mismatchFields.has(row.key);
                                                        return (
                                                            <div
                                                                key={`${citation.id}-${row.key}`}
                                                                className={`grid gap-2 rounded-md border p-3 text-sm md:grid-cols-[140px_1fr_1fr] ${
                                                                    mismatched
                                                                        ? "border-rose-200 bg-rose-50"
                                                                        : "border-border bg-background"
                                                                }`}
                                                            >
                                                                <div className="font-medium text-foreground">{row.label}</div>
                                                                <div>
                                                                    <div className="text-xs text-muted-foreground">Canonical</div>
                                                                    <div>{row.expected || "(blank)"}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-muted-foreground">As listed</div>
                                                                    <div>{row.actual || "(blank)"}</div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {record.mismatches.length ? (
                                                        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
                                                            {record.mismatches.map((mismatch) => (
                                                                <div key={`${citation.id}-${mismatch.field}`}>
                                                                    {mismatch.field}: expected "{mismatch.expected}" but found "{mismatch.actual || "(blank)"}".
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-md border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                                    No citation records found.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

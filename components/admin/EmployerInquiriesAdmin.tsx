"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Inquiry = {
    id: string;
    companyName: string;
    contactName: string;
    email: string;
    phone: string | null;
    employeeCount: number | null;
    employeeCountRange: string | null;
    message: string | null;
    status: string;
    submittedAt: string;
    updatedAt: string;
};

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
    { value: "NEW", label: "New" },
    { value: "CONTACTED", label: "Contacted" },
    { value: "CONVERTED", label: "Converted" },
    { value: "CLOSED", label: "Closed" },
];

function statusBadge(status: string) {
    if (status === "NEW") return <Badge className="bg-sky-600">New</Badge>;
    if (status === "CONTACTED") return <Badge className="bg-amber-600">Contacted</Badge>;
    if (status === "CONVERTED") return <Badge className="bg-emerald-600">Converted</Badge>;
    if (status === "CLOSED") return <Badge variant="outline">Closed</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
}

export function EmployerInquiriesAdmin() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [query, setQuery] = useState<string>("");
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(25);
    const [total, setTotal] = useState<number>(0);

    const [savingId, setSavingId] = useState<string | null>(null);
    const didMount = useRef(false);

    const canPrev = page > 1;
    const canNext = page * pageSize < total;

    const filterQuery = useMemo(() => query.trim(), [query]);

    async function fetchInquiries(opts?: { page?: number; pageSize?: number }) {
        setLoading(true);
        setError(null);
        try {
            const nextPage = opts?.page ?? page;
            const nextPageSize = opts?.pageSize ?? pageSize;

            const params = new URLSearchParams();
            if (statusFilter !== "ALL") params.set("status", statusFilter);
            if (filterQuery) params.set("q", filterQuery);
            params.set("page", String(nextPage));
            params.set("pageSize", String(nextPageSize));

            const res = await fetch(`/api/admin/employer-inquiries?${params.toString()}`);
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to load inquiries");

            setInquiries(Array.isArray(data.inquiries) ? data.inquiries : []);
            setTotal(typeof data.total === "number" ? data.total : 0);
            setPage(typeof data.page === "number" ? data.page : nextPage);
            setPageSize(typeof data.pageSize === "number" ? data.pageSize : nextPageSize);
        } catch (e: any) {
            setError(e?.message || "Failed to load inquiries");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void fetchInquiries({ page: 1 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    useEffect(() => {
        if (!didMount.current) {
            didMount.current = true;
            return;
        }
        const handle = setTimeout(() => {
            void fetchInquiries({ page: 1 });
        }, 350);
        return () => clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterQuery]);

    async function updateStatus(id: string, nextStatus: string) {
        setSavingId(id);
        setError(null);
        try {
            const res = await fetch(`/api/admin/employer-inquiries/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nextStatus }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to update status");
            setInquiries((prev) => prev.map((x) => (x.id === id ? { ...x, status: data.inquiry?.status || nextStatus, updatedAt: data.inquiry?.updatedAt || x.updatedAt } : x)));
        } catch (e: any) {
            setError(e?.message || "Failed to update status");
        } finally {
            setSavingId(null);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Employer inquiries</h1>
                    <p className="text-sm text-muted-foreground">
                        Submissions from <span className="font-mono">/for-employers</span>. Update the status as you follow up.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => void fetchInquiries()} disabled={loading}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button asChild>
                        <Link href="/for-employers" target="_blank">
                            View landing page
                        </Link>
                    </Button>
                </div>
            </div>

            {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
            ) : null}

            <Card className="border-border/60">
                <CardHeader className="flex-row items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                        <CardTitle className="text-lg">Filters</CardTitle>
                        <CardDescription>
                            {total} total
                            {statusFilter !== "ALL" ? ` • ${statusFilter.toLowerCase()}` : ""}
                            {filterQuery ? ` • search: ${filterQuery}` : ""}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="grid gap-2">
                            <Label htmlFor="statusFilter">Status</Label>
                            <select
                                id="statusFilter"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="ALL">All</option>
                                {STATUS_OPTIONS.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="query">Search</Label>
                            <Input
                                id="query"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Company, contact, email..."
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3 flex-wrap text-sm text-muted-foreground">
                    <div>
                        Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={!canPrev || loading} onClick={() => void fetchInquiries({ page: page - 1 })}>
                            Prev
                        </Button>
                        <Button variant="outline" size="sm" disabled={!canNext || loading} onClick={() => void fetchInquiries({ page: page + 1 })}>
                            Next
                        </Button>
                        <select
                            value={String(pageSize)}
                            onChange={(e) => void fetchInquiries({ page: 1, pageSize: Number.parseInt(e.target.value, 10) || 25 })}
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                            aria-label="Page size"
                            disabled={loading}
                        >
                            {[10, 25, 50, 100].map((n) => (
                                <option key={n} value={String(n)}>
                                    {n}/page
                                </option>
                            ))}
                        </select>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : inquiries.length ? (
                <div className="grid gap-4">
                    {inquiries.map((inq) => {
                        const employeeCountLabel = inq.employeeCountRange || (typeof inq.employeeCount === "number" ? String(inq.employeeCount) : "");
                        return (
                            <Card key={inq.id} className="border-border/60">
                                <CardHeader className="flex-row items-start justify-between gap-4 flex-wrap">
                                    <div className="space-y-2 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {statusBadge(inq.status)}
                                            <div className="text-xs text-muted-foreground">
                                                Submitted {new Date(inq.submittedAt).toLocaleString()}
                                            </div>
                                        </div>
                                        <CardTitle className="text-lg leading-tight truncate">{inq.companyName}</CardTitle>
                                        <div className="text-sm text-muted-foreground">
                                            {inq.contactName} •{" "}
                                            <a href={`mailto:${inq.email}`} className="text-primary hover:underline">
                                                {inq.email}
                                            </a>
                                            {inq.phone ? ` • ${inq.phone}` : ""}
                                            {employeeCountLabel ? ` • Employees: ${employeeCountLabel}` : ""}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={inq.status}
                                            onChange={(e) => void updateStatus(inq.id, e.target.value)}
                                            disabled={savingId === inq.id}
                                            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                            aria-label="Update inquiry status"
                                        >
                                            {STATUS_OPTIONS.map((s) => (
                                                <option key={s.value} value={s.value}>
                                                    {s.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground space-y-2">
                                    {inq.message ? (
                                        <div className="rounded-lg border border-border bg-muted/10 p-3 whitespace-pre-wrap">
                                            {inq.message}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-muted-foreground">No message provided.</div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-2xl border border-border bg-muted/20 p-8 text-muted-foreground">
                    No inquiries match your filters.
                </div>
            )}
        </div>
    );
}

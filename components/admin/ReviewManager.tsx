"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles, Copy, Plus, Trash2, Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type ReviewPlatform = "GOOGLE" | "YELP" | "HEALTHGRADES" | "ZOCDOC" | "FACEBOOK" | "OTHER";
type ResponseStatus = "PENDING" | "DRAFTED" | "RESPONDED" | "SKIPPED";

type Review = {
    id: string;
    platform: ReviewPlatform;
    reviewerName: string;
    rating: number;
    reviewText: string;
    reviewDate: string;
    reviewUrl: string | null;
    responseStatus: ResponseStatus;
    responseText: string | null;
    responseApprovedAt: string | null;
    respondedDate: string | null;
    draftGeneratedAt: string | null;
    createdAt: string;
    updatedAt: string;
    responseTimeHours?: number | null;
};

type ReviewAnalytics = {
    byPlatform: Array<{
        platform: ReviewPlatform;
        platformLabel: string;
        averageRating: number;
        reviewCount: number;
    }>;
    volumeByMonth: Array<{ key: string; label: string; count: number }>;
    totalReviews: number;
    pendingCount: number;
    averageResponseTimeHours: number | null;
    responseSamples: number;
    within24hRate: number | null;
};

type RequestConfig = {
    googleUrl: string;
    yelpUrl: string;
    healthgradesUrl: string;
    zocdocUrl: string;
    facebookUrl: string;
    otherLabel: string;
    otherUrl: string;
};

type RequestLink = {
    id: string;
    token: string;
    name: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    requestUrl: string;
    _count?: { clicks: number };
    platformCounts?: Partial<Record<ReviewPlatform, number>>;
};

const PLATFORM_OPTIONS: Array<{ value: ReviewPlatform; label: string }> = [
    { value: "GOOGLE", label: "Google" },
    { value: "YELP", label: "Yelp" },
    { value: "HEALTHGRADES", label: "Healthgrades" },
    { value: "ZOCDOC", label: "Zocdoc" },
    { value: "FACEBOOK", label: "Facebook" },
    { value: "OTHER", label: "Other" },
];

const RESPONSE_STATUS_OPTIONS: Array<{ value: ResponseStatus; label: string }> = [
    { value: "PENDING", label: "Pending" },
    { value: "DRAFTED", label: "Drafted" },
    { value: "RESPONDED", label: "Responded" },
    { value: "SKIPPED", label: "Skipped" },
];

function toDateInput(value: string | null | undefined) {
    if (!value) return "";
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
}

function formatDateTime(value: string | null | undefined) {
    if (!value) return "";
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return "";
    return d.toLocaleString();
}

function formatDate(value: string | null | undefined) {
    if (!value) return "";
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return "";
    return d.toLocaleDateString();
}

function ratingStars(rating: number) {
    return `${"★".repeat(Math.max(0, Math.min(5, rating)))}${"☆".repeat(Math.max(0, 5 - rating))}`;
}

function statusBadge(status: ResponseStatus) {
    if (status === "PENDING") return <Badge className="bg-amber-600">Pending</Badge>;
    if (status === "DRAFTED") return <Badge className="bg-sky-600">Drafted</Badge>;
    if (status === "RESPONDED") return <Badge className="bg-emerald-600">Responded</Badge>;
    return <Badge variant="outline">Skipped</Badge>;
}

export function ReviewManager() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [drafting, setDrafting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [reviews, setReviews] = useState<Review[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [platformFilter, setPlatformFilter] = useState<string>("ALL");
    const [query, setQuery] = useState("");

    const [analytics, setAnalytics] = useState<ReviewAnalytics | null>(null);
    const [requestConfig, setRequestConfig] = useState<RequestConfig>({
        googleUrl: "",
        yelpUrl: "",
        healthgradesUrl: "",
        zocdocUrl: "",
        facebookUrl: "",
        otherLabel: "Other",
        otherUrl: "",
    });
    const [requestLinks, setRequestLinks] = useState<RequestLink[]>([]);
    const [newLinkName, setNewLinkName] = useState("");

    const [quickAdd, setQuickAdd] = useState({
        platform: "GOOGLE" as ReviewPlatform,
        reviewerName: "",
        rating: "5",
        reviewText: "",
        reviewDate: new Date().toISOString().slice(0, 10),
        reviewUrl: "",
    });

    const [bulkImport, setBulkImport] = useState({
        fallbackPlatform: "GOOGLE" as ReviewPlatform,
        raw: "",
    });

    const volumeMax = useMemo(() => {
        const max = Math.max(...(analytics?.volumeByMonth || []).map((x) => x.count), 0);
        return Math.max(1, max);
    }, [analytics?.volumeByMonth]);

    const canPrev = page > 1;
    const canNext = page * pageSize < total;

    async function copyText(value: string) {
        const text = String(value || "").trim();
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setMessage("Copied to clipboard.");
        } catch {
            setError("Clipboard copy failed in this browser context.");
        }
    }

    function patchReview(id: string, patch: Partial<Review>) {
        setReviews((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    }

    async function loadReviews(nextPage = page, nextPageSize = pageSize) {
        const params = new URLSearchParams();
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        if (platformFilter !== "ALL") params.set("platform", platformFilter);
        if (query.trim()) params.set("q", query.trim());
        params.set("page", String(nextPage));
        params.set("pageSize", String(nextPageSize));

        const res = await fetch(`/api/admin/reviews?${params.toString()}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
            throw new Error(data?.error || "Failed to load reviews");
        }

        setReviews(Array.isArray(data.reviews) ? (data.reviews as Review[]) : []);
        setTotal(typeof data.total === "number" ? data.total : 0);
        setPage(typeof data.page === "number" ? data.page : nextPage);
        setPageSize(typeof data.pageSize === "number" ? data.pageSize : nextPageSize);
    }

    async function loadAnalytics() {
        const res = await fetch("/api/admin/reviews/analytics", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
            throw new Error(data?.error || "Failed to load analytics");
        }
        setAnalytics(data.analytics as ReviewAnalytics);
    }

    async function loadRequestSettings() {
        const [configRes, linksRes] = await Promise.all([
            fetch("/api/admin/reviews/request-config", { cache: "no-store" }),
            fetch("/api/admin/reviews/request-links", { cache: "no-store" }),
        ]);

        const configData = await configRes.json().catch(() => null);
        const linksData = await linksRes.json().catch(() => null);

        if (!configRes.ok || !configData?.success) {
            throw new Error(configData?.error || "Failed to load review request config");
        }
        if (!linksRes.ok || !linksData?.success) {
            throw new Error(linksData?.error || "Failed to load review request links");
        }

        setRequestConfig(configData.config as RequestConfig);
        setRequestLinks(Array.isArray(linksData.links) ? (linksData.links as RequestLink[]) : []);
    }

    async function loadAll() {
        setLoading(true);
        setError(null);
        try {
            await Promise.all([loadReviews(1, pageSize), loadAnalytics(), loadRequestSettings()]);
        } catch (e: any) {
            setError(e?.message || "Failed to load review manager");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function reloadReviewsForFilters(nextPage = 1, nextPageSize = pageSize) {
        setLoading(true);
        setError(null);
        try {
            await loadReviews(nextPage, nextPageSize);
        } catch (e: any) {
            setError(e?.message || "Failed to load reviews");
        } finally {
            setLoading(false);
        }
    }

    async function createQuickReview() {
        setSaving("quick-add");
        setError(null);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    platform: quickAdd.platform,
                    reviewerName: quickAdd.reviewerName,
                    rating: Number.parseInt(quickAdd.rating, 10),
                    reviewText: quickAdd.reviewText,
                    reviewDate: quickAdd.reviewDate,
                    reviewUrl: quickAdd.reviewUrl,
                }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to add review");
            }

            setQuickAdd({
                platform: "GOOGLE",
                reviewerName: "",
                rating: "5",
                reviewText: "",
                reviewDate: new Date().toISOString().slice(0, 10),
                reviewUrl: "",
            });
            setMessage("Review added.");
            await Promise.all([reloadReviewsForFilters(1, pageSize), loadAnalytics()]);
        } catch (e: any) {
            setError(e?.message || "Failed to add review");
        } finally {
            setSaving(null);
        }
    }

    async function importBulkReviews() {
        setSaving("bulk-import");
        setError(null);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "BULK_IMPORT",
                    fallbackPlatform: bulkImport.fallbackPlatform,
                    raw: bulkImport.raw,
                }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                const parseErrors = Array.isArray(data?.errors) ? ` ${data.errors.join(" ")}` : "";
                throw new Error((data?.error || "Bulk import failed") + parseErrors);
            }

            const errMsg = Array.isArray(data.errors) && data.errors.length
                ? ` Imported ${data.createdCount} reviews with ${data.errors.length} parse warnings.`
                : `Imported ${data.createdCount} reviews.`;
            setMessage(errMsg);
            setBulkImport((prev) => ({ ...prev, raw: "" }));
            await Promise.all([reloadReviewsForFilters(1, pageSize), loadAnalytics()]);
        } catch (e: any) {
            setError(e?.message || "Bulk import failed");
        } finally {
            setSaving(null);
        }
    }

    async function saveReview(review: Review) {
        setSaving(review.id);
        setError(null);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/reviews/${review.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    platform: review.platform,
                    reviewerName: review.reviewerName,
                    rating: review.rating,
                    reviewText: review.reviewText,
                    reviewDate: review.reviewDate,
                    reviewUrl: review.reviewUrl,
                    responseStatus: review.responseStatus,
                    responseText: review.responseText || "",
                }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to save review");
            }

            patchReview(review.id, data.review as Review);
            setMessage("Review saved.");
            await loadAnalytics();
        } catch (e: any) {
            setError(e?.message || "Failed to save review");
        } finally {
            setSaving(null);
        }
    }

    async function draftResponse(reviewId: string) {
        setDrafting(reviewId);
        setError(null);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/reviews/${reviewId}/draft-response`, { method: "POST" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to draft response");
            }
            patchReview(reviewId, data.review as Review);
            setMessage("AI response drafted. Review and edit before approving.");
            await loadAnalytics();
        } catch (e: any) {
            setError(e?.message || "Failed to draft response");
        } finally {
            setDrafting(null);
        }
    }

    async function approveResponse(reviewId: string) {
        setSaving(`approve-${reviewId}`);
        setError(null);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/reviews/${reviewId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ approveResponse: true }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to approve response");
            }
            patchReview(reviewId, data.review as Review);
            setMessage("Response approved. You can now mark as responded after posting.");
        } catch (e: any) {
            setError(e?.message || "Failed to approve response");
        } finally {
            setSaving(null);
        }
    }

    async function markResponded(reviewId: string) {
        setSaving(`respond-${reviewId}`);
        setError(null);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/reviews/${reviewId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ responseStatus: "RESPONDED" }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to mark responded");
            }
            patchReview(reviewId, data.review as Review);
            setMessage("Marked as responded.");
            await loadAnalytics();
        } catch (e: any) {
            setError(e?.message || "Failed to mark responded");
        } finally {
            setSaving(null);
        }
    }

    async function deleteReview(reviewId: string) {
        if (!confirm("Delete this review entry?")) return;

        setSaving(`delete-${reviewId}`);
        setError(null);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to delete review");
            }
            setReviews((prev) => prev.filter((row) => row.id !== reviewId));
            setTotal((prev) => Math.max(0, prev - 1));
            setMessage("Review deleted.");
            await loadAnalytics();
        } catch (e: any) {
            setError(e?.message || "Failed to delete review");
        } finally {
            setSaving(null);
        }
    }

    async function saveRequestConfig() {
        setSaving("request-config");
        setError(null);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/reviews/request-config", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestConfig),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to save review request config");
            }
            setRequestConfig(data.config as RequestConfig);
            setMessage("Review request destination URLs saved.");
        } catch (e: any) {
            setError(e?.message || "Failed to save review request config");
        } finally {
            setSaving(null);
        }
    }

    async function createRequestLink() {
        setSaving("create-link");
        setError(null);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/reviews/request-links", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newLinkName }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to create request link");
            }
            setNewLinkName("");
            await loadRequestSettings();
            setMessage("Review request link created.");
        } catch (e: any) {
            setError(e?.message || "Failed to create request link");
        } finally {
            setSaving(null);
        }
    }

    async function updateRequestLink(linkId: string, patch: { name?: string; isActive?: boolean }) {
        setSaving(`link-${linkId}`);
        setError(null);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/reviews/request-links/${linkId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patch),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to update request link");
            }
            await loadRequestSettings();
            setMessage("Review request link updated.");
        } catch (e: any) {
            setError(e?.message || "Failed to update request link");
        } finally {
            setSaving(null);
        }
    }

    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
                    <p className="text-sm text-muted-foreground">
                        Track public reviews across platforms and draft HIPAA-safe responses for human approval.
                    </p>
                </div>
                <Button variant="outline" onClick={() => void loadAll()} disabled={loading}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
            ) : null}
            {message ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>
            ) : null}

            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Response drafts are suggestions only. Never post without human review. Do not include PHI or confirm reviewer patient status.
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Total Reviews</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">{analytics?.totalReviews ?? 0}</CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Pending Response</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">{analytics?.pendingCount ?? 0}</CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Avg Response Time</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">
                        {analytics?.averageResponseTimeHours == null ? "-" : `${analytics.averageResponseTimeHours}h`}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Responded &lt;24h</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">
                        {analytics?.within24hRate == null ? "-" : `${Math.round(analytics.within24hRate * 100)}%`}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle>Review Volume Over Time</CardTitle>
                        <CardDescription>Last 12 months</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-12 gap-2 items-end h-40">
                            {(analytics?.volumeByMonth || []).map((item) => {
                                const h = Math.max(8, Math.round((item.count / volumeMax) * 100));
                                return (
                                    <div key={item.key} className="flex flex-col items-center gap-2 min-w-0">
                                        <div className="text-[10px] text-muted-foreground">{item.count}</div>
                                        <div className="w-full bg-sky-500/80 rounded-sm" style={{ height: `${h}%` }} />
                                        <div className="text-[10px] text-muted-foreground truncate w-full text-center">{item.label}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle>Average Rating By Platform</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {(analytics?.byPlatform || []).length ? (
                            analytics!.byPlatform.map((row) => (
                                <div key={row.platform} className="flex items-center justify-between gap-3">
                                    <div>{row.platformLabel}</div>
                                    <div className="text-right">
                                        <div className="font-medium">{row.averageRating.toFixed(2)} / 5</div>
                                        <div className="text-xs text-muted-foreground">{row.reviewCount} reviews</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-muted-foreground">No data yet.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border/60">
                <CardHeader>
                    <CardTitle>Manual Entry</CardTitle>
                    <CardDescription>
                        Add reviews manually or paste multiple reviews for import parsing.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="quick-add">
                        <TabsList>
                            <TabsTrigger value="quick-add">Quick Add</TabsTrigger>
                            <TabsTrigger value="bulk-import">Bulk Import</TabsTrigger>
                        </TabsList>

                        <TabsContent value="quick-add" className="mt-4 space-y-4">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="grid gap-2">
                                    <Label>Platform</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={quickAdd.platform}
                                        onChange={(e) => setQuickAdd((prev) => ({ ...prev, platform: e.target.value as ReviewPlatform }))}
                                    >
                                        {PLATFORM_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid gap-2">
                                    <Label>Reviewer name</Label>
                                    <Input
                                        value={quickAdd.reviewerName}
                                        onChange={(e) => setQuickAdd((prev) => ({ ...prev, reviewerName: e.target.value }))}
                                        placeholder="Public display name"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Rating (1-5)</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={5}
                                        value={quickAdd.rating}
                                        onChange={(e) => setQuickAdd((prev) => ({ ...prev, rating: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label>Review date</Label>
                                    <Input
                                        type="date"
                                        value={quickAdd.reviewDate}
                                        onChange={(e) => setQuickAdd((prev) => ({ ...prev, reviewDate: e.target.value }))}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Review URL</Label>
                                    <Input
                                        value={quickAdd.reviewUrl}
                                        onChange={(e) => setQuickAdd((prev) => ({ ...prev, reviewUrl: e.target.value }))}
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Review text</Label>
                                <Textarea
                                    rows={5}
                                    value={quickAdd.reviewText}
                                    onChange={(e) => setQuickAdd((prev) => ({ ...prev, reviewText: e.target.value }))}
                                />
                            </div>

                            <div>
                                <Button onClick={() => void createQuickReview()} disabled={saving === "quick-add"}>
                                    {saving === "quick-add" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                                    Add Review
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="bulk-import" className="mt-4 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label>Fallback platform</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={bulkImport.fallbackPlatform}
                                        onChange={(e) => setBulkImport((prev) => ({ ...prev, fallbackPlatform: e.target.value as ReviewPlatform }))}
                                    >
                                        {PLATFORM_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Bulk text</Label>
                                <Textarea
                                    rows={10}
                                    value={bulkImport.raw}
                                    onChange={(e) => setBulkImport((prev) => ({ ...prev, raw: e.target.value }))}
                                    placeholder={[
                                        "Platform: Google",
                                        "Reviewer: Jane D.",
                                        "Rating: 5",
                                        "Date: 2026-02-10",
                                        "URL: https://...",
                                        "Review: Great communication and easy telehealth follow-up.",
                                        "---",
                                        "Yelp | 3 stars | Sam T | 2026-02-09",
                                        "Helpful care but appointment timing could improve.",
                                    ].join("\n")}
                                />
                            </div>
                            <div>
                                <Button onClick={() => void importBulkReviews()} disabled={saving === "bulk-import"}>
                                    {saving === "bulk-import" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                    Import Reviews
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Card className="border-border/60">
                <CardHeader>
                    <CardTitle>Review Tracker</CardTitle>
                    <CardDescription>
                        Response workflow: draft → human edit/review → approve → post externally → mark responded.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-5">
                        <div className="grid gap-2">
                            <Label>Status</Label>
                            <select
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL">All</option>
                                {RESPONSE_STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Platform</Label>
                            <select
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={platformFilter}
                                onChange={(e) => setPlatformFilter(e.target.value)}
                            >
                                <option value="ALL">All</option>
                                {PLATFORM_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid gap-2 md:col-span-2">
                            <Label>Search</Label>
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Reviewer name or review text"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <Button variant="outline" onClick={() => void reloadReviewsForFilters(1, pageSize)}>
                                Apply
                            </Button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : reviews.length ? (
                        <div className="space-y-4">
                            {reviews.map((review) => {
                                const stalePending = review.responseStatus !== "RESPONDED" && (Date.now() - new Date(review.reviewDate).getTime()) > 24 * 60 * 60 * 1000;
                                const approved = Boolean(review.responseApprovedAt);
                                const reviewUrl = review.reviewUrl || "";

                                return (
                                    <Card key={review.id} className="border-border/60">
                                        <CardHeader className="space-y-3">
                                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge variant="outline">
                                                        {PLATFORM_OPTIONS.find((p) => p.value === review.platform)?.label || review.platform}
                                                    </Badge>
                                                    {statusBadge(review.responseStatus)}
                                                    <Badge variant="outline">{ratingStars(review.rating)} ({review.rating}/5)</Badge>
                                                    {stalePending ? (
                                                        <Badge className="bg-rose-600">
                                                            <Clock3 className="h-3.5 w-3.5 mr-1" />
                                                            &gt;24h pending
                                                        </Badge>
                                                    ) : null}
                                                    {review.responseTimeHours !== null && review.responseTimeHours !== undefined ? (
                                                        <Badge variant="outline">Response time: {review.responseTimeHours}h</Badge>
                                                    ) : null}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Review date: {formatDate(review.reviewDate)}
                                                </div>
                                            </div>

                                            <div className="grid gap-3 md:grid-cols-4">
                                                <div className="grid gap-2 md:col-span-2">
                                                    <Label>Reviewer name</Label>
                                                    <Input
                                                        value={review.reviewerName}
                                                        onChange={(e) => patchReview(review.id, { reviewerName: e.target.value })}
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Rating</Label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        max={5}
                                                        value={String(review.rating)}
                                                        onChange={(e) => patchReview(review.id, { rating: Number.parseInt(e.target.value, 10) || 1 })}
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Status</Label>
                                                    <select
                                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                                        value={review.responseStatus}
                                                        onChange={(e) => patchReview(review.id, { responseStatus: e.target.value as ResponseStatus })}
                                                    >
                                                        {RESPONSE_STATUS_OPTIONS.map((option) => (
                                                            <option key={option.value} value={option.value}>{option.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid gap-3 md:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label>Review date</Label>
                                                    <Input
                                                        type="date"
                                                        value={toDateInput(review.reviewDate)}
                                                        onChange={(e) => patchReview(review.id, { reviewDate: e.target.value })}
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Review URL</Label>
                                                    <Input
                                                        value={reviewUrl}
                                                        onChange={(e) => patchReview(review.id, { reviewUrl: e.target.value })}
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="space-y-4">
                                            <div className="grid gap-2">
                                                <Label>Review text</Label>
                                                <Textarea
                                                    value={review.reviewText}
                                                    onChange={(e) => patchReview(review.id, { reviewText: e.target.value })}
                                                    rows={4}
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label>Response draft</Label>
                                                <Textarea
                                                    value={review.responseText || ""}
                                                    onChange={(e) => patchReview(review.id, { responseText: e.target.value })}
                                                    rows={4}
                                                    placeholder="Drafted response appears here"
                                                />
                                                <div className="text-xs text-muted-foreground">
                                                    Approved: {approved ? formatDateTime(review.responseApprovedAt) : "No"}
                                                    {review.respondedDate ? ` • Responded date: ${formatDateTime(review.respondedDate)}` : ""}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => void draftResponse(review.id)}
                                                    disabled={drafting === review.id}
                                                >
                                                    {drafting === review.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                                                    Draft Response
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => void saveReview(review)}
                                                    disabled={Boolean(saving)}
                                                >
                                                    Save
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => void approveResponse(review.id)}
                                                    disabled={Boolean(saving) || !String(review.responseText || "").trim()}
                                                >
                                                    Approve Draft
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => void markResponded(review.id)}
                                                    disabled={Boolean(saving) || !approved}
                                                >
                                                    Mark Responded
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => void copyText(review.responseText || "")}
                                                    disabled={!String(review.responseText || "").trim()}
                                                >
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    Copy Response
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => void deleteReview(review.id)}
                                                    disabled={Boolean(saving)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}

                            <div className="flex items-center justify-between gap-3 flex-wrap text-sm text-muted-foreground">
                                <div>
                                    Page {page} of {Math.max(1, Math.ceil(total / pageSize))} • {total} reviews
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => void reloadReviewsForFilters(page - 1, pageSize)}>
                                        Prev
                                    </Button>
                                    <Button variant="outline" size="sm" disabled={!canNext} onClick={() => void reloadReviewsForFilters(page + 1, pageSize)}>
                                        Next
                                    </Button>
                                    <select
                                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                        value={String(pageSize)}
                                        onChange={(e) => {
                                            const next = Number.parseInt(e.target.value, 10) || 25;
                                            setPageSize(next);
                                            void reloadReviewsForFilters(1, next);
                                        }}
                                    >
                                        {[10, 25, 50, 100].map((n) => (
                                            <option key={n} value={String(n)}>{n}/page</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                            No reviews found for the selected filters.
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-border/60">
                <CardHeader>
                    <CardTitle>Review Request Link System</CardTitle>
                    <CardDescription>
                        Create unique review-request links and set destination URLs for each platform.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>Google URL</Label>
                            <Input value={requestConfig.googleUrl} onChange={(e) => setRequestConfig((prev) => ({ ...prev, googleUrl: e.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Yelp URL</Label>
                            <Input value={requestConfig.yelpUrl} onChange={(e) => setRequestConfig((prev) => ({ ...prev, yelpUrl: e.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Healthgrades URL</Label>
                            <Input value={requestConfig.healthgradesUrl} onChange={(e) => setRequestConfig((prev) => ({ ...prev, healthgradesUrl: e.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Zocdoc URL</Label>
                            <Input value={requestConfig.zocdocUrl} onChange={(e) => setRequestConfig((prev) => ({ ...prev, zocdocUrl: e.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Facebook URL</Label>
                            <Input value={requestConfig.facebookUrl} onChange={(e) => setRequestConfig((prev) => ({ ...prev, facebookUrl: e.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Other Label</Label>
                            <Input value={requestConfig.otherLabel} onChange={(e) => setRequestConfig((prev) => ({ ...prev, otherLabel: e.target.value }))} />
                        </div>
                        <div className="grid gap-2 md:col-span-2">
                            <Label>Other URL</Label>
                            <Input value={requestConfig.otherUrl} onChange={(e) => setRequestConfig((prev) => ({ ...prev, otherUrl: e.target.value }))} />
                        </div>
                    </div>

                    <div>
                        <Button onClick={() => void saveRequestConfig()} disabled={saving === "request-config"}>
                            {saving === "request-config" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Save Request Destinations
                        </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1fr_auto] items-end">
                        <div className="grid gap-2">
                            <Label>New link name (optional)</Label>
                            <Input value={newLinkName} onChange={(e) => setNewLinkName(e.target.value)} placeholder="Post-visit SMS link" />
                        </div>
                        <Button onClick={() => void createRequestLink()} disabled={saving === "create-link"}>
                            {saving === "create-link" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                            Create Link
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {requestLinks.length ? requestLinks.map((link) => (
                            <Card key={link.id} className="border-border/60">
                                <CardContent className="pt-6 space-y-3">
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div>
                                            <div className="font-medium text-foreground">{link.name || "(Unnamed link)"}</div>
                                            <div className="text-xs text-muted-foreground">Token: {link.token}</div>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Total clicks: {link._count?.clicks || 0}
                                        </div>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] items-center">
                                        <Input
                                            value={link.requestUrl}
                                            readOnly
                                            onClick={(e) => (e.target as HTMLInputElement).select()}
                                        />
                                        <Button variant="outline" size="sm" onClick={() => void copyText(link.requestUrl)}>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => void updateRequestLink(link.id, { isActive: !link.isActive })}
                                            disabled={saving === `link-${link.id}`}
                                        >
                                            {link.isActive ? "Deactivate" : "Activate"}
                                        </Button>
                                    </div>

                                    <div className="grid gap-2 md:grid-cols-[1fr_auto] items-end">
                                        <div className="grid gap-2">
                                            <Label>Link name</Label>
                                            <Input
                                                value={link.name || ""}
                                                onChange={(e) => {
                                                    const name = e.target.value;
                                                    setRequestLinks((prev) => prev.map((row) => row.id === link.id ? { ...row, name } : row));
                                                }}
                                            />
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => void updateRequestLink(link.id, { name: link.name || "" })}
                                            disabled={saving === `link-${link.id}`}
                                        >
                                            Save Name
                                        </Button>
                                    </div>

                                    {link.platformCounts ? (
                                        <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                                            {PLATFORM_OPTIONS.map((p) => (
                                                <span key={p.value}>{p.label}: {link.platformCounts?.[p.value] || 0}</span>
                                            ))}
                                        </div>
                                    ) : null}
                                </CardContent>
                            </Card>
                        )) : (
                            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                                No request links yet.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

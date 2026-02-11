"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Severity = "MUST_FIX" | "REVIEW_RECOMMENDED" | "SUGGESTION";

type SafetyFlag = {
    id: string;
    severity: Severity;
    category: string;
    flaggedText: string;
    reason: string;
    suggestedFix: string;
    stateConcern?: string;
    citationNeeded?: boolean;
    reviewedApproved?: boolean;
    reviewedNote?: string;
    reviewedByUserId?: string;
    reviewedAt?: string;
};

type SafetySummary = {
    issueCount: number;
    mustFixCount: number;
    reviewCount: number;
    suggestionCount: number;
    unresolvedMustFixCount: number;
};

type DisclaimerTemplate = {
    key: string;
    title: string;
    text: string;
    category: "general" | "financial" | "state";
};

type SafetyReview = {
    id: string;
    status: "PASS" | "NEEDS_FIX" | "OVERRIDDEN";
    trigger: string;
    provider: string | null;
    model: string | null;
    createdAt: string;
    updatedAt: string;
};

const SEVERITY_META: Record<Severity, { label: string; badgeClass: string }> = {
    MUST_FIX: { label: "🔴 Must Fix", badgeClass: "bg-red-600" },
    REVIEW_RECOMMENDED: { label: "🟡 Review Recommended", badgeClass: "bg-amber-500 text-black" },
    SUGGESTION: { label: "🟢 Suggestion", badgeClass: "bg-emerald-600" },
};

export function ArticleSafetyPanel({
    articleId,
    onInsertDisclaimer,
}: {
    articleId?: string;
    onInsertDisclaimer?: (text: string) => void;
}) {
    const [loading, setLoading] = useState(false);
    const [running, setRunning] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);

    const [error, setError] = useState<string | null>(null);

    const [review, setReview] = useState<SafetyReview | null>(null);
    const [flags, setFlags] = useState<SafetyFlag[]>([]);
    const [summary, setSummary] = useState<SafetySummary | null>(null);
    const [stale, setStale] = useState<boolean>(false);
    const [disclaimers, setDisclaimers] = useState<DisclaimerTemplate[]>([]);

    const [notesByFlagId, setNotesByFlagId] = useState<Record<string, string>>({});
    const [globalOverrideReason, setGlobalOverrideReason] = useState("");

    async function loadSafety() {
        if (!articleId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/articles/${articleId}/safety-check`, { cache: "no-store" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to load safety review");

            setReview(data.review || null);
            setFlags(Array.isArray(data.flags) ? (data.flags as SafetyFlag[]) : []);
            setSummary((data.summary as SafetySummary | null) || null);
            setStale(Boolean(data.stale));
            setDisclaimers(Array.isArray(data.disclaimerLibrary) ? (data.disclaimerLibrary as DisclaimerTemplate[]) : []);
        } catch (e: any) {
            setError(e?.message || "Failed to load safety review");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadSafety();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [articleId]);

    useEffect(() => {
        const handler = () => {
            void loadSafety();
        };
        window.addEventListener("article-safety-refresh", handler);
        return () => window.removeEventListener("article-safety-refresh", handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [articleId]);

    async function runSafetyCheck() {
        if (!articleId) return;
        setRunning(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/articles/${articleId}/safety-check`, { method: "POST" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to run safety check");

            setReview(data.review || null);
            setFlags(Array.isArray(data.flags) ? (data.flags as SafetyFlag[]) : []);
            setSummary((data.summary as SafetySummary | null) || null);
            setStale(false);
        } catch (e: any) {
            setError(e?.message || "Failed to run safety check");
        } finally {
            setRunning(false);
        }
    }

    async function approveFlag(flagId: string) {
        if (!articleId || !review) return;
        const note = (notesByFlagId[flagId] || "").trim();
        if (!note) {
            setError("An approval note is required for override history.");
            return;
        }

        setSaving(flagId);
        setError(null);
        try {
            const res = await fetch(`/api/admin/articles/${articleId}/safety-check`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "APPROVE_FLAG",
                    reviewId: review.id,
                    flagId,
                    note,
                }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to approve flag");

            setReview(data.review || null);
            setFlags(Array.isArray(data.flags) ? (data.flags as SafetyFlag[]) : []);
            setSummary((data.summary as SafetySummary | null) || null);
        } catch (e: any) {
            setError(e?.message || "Failed to approve flag");
        } finally {
            setSaving(null);
        }
    }

    async function overrideAllMustFix() {
        if (!articleId || !review) return;
        const reason = globalOverrideReason.trim();
        if (!reason) {
            setError("Override reason is required.");
            return;
        }

        setSaving("OVERRIDE_ALL");
        setError(null);
        try {
            const res = await fetch(`/api/admin/articles/${articleId}/safety-check`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "OVERRIDE_ALL",
                    reviewId: review.id,
                    reason,
                }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to apply override");

            setReview(data.review || null);
            setFlags(Array.isArray(data.flags) ? (data.flags as SafetyFlag[]) : []);
            setSummary((data.summary as SafetySummary | null) || null);
            setGlobalOverrideReason("");
        } catch (e: any) {
            setError(e?.message || "Failed to apply override");
        } finally {
            setSaving(null);
        }
    }

    const mustFixOpen = useMemo(
        () => flags.filter((flag) => flag.severity === "MUST_FIX" && !flag.reviewedApproved).length,
        [flags]
    );

    return (
        <Card className="border-border/60">
            <CardHeader>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <CardTitle className="text-lg">Content Safety Review</CardTitle>
                        <CardDescription>
                            YMYL healthcare checks for diagnosis/treatment language, claims, disclaimers, scope, and legal concerns.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => void loadSafety()} disabled={loading || running}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                        <Button size="sm" onClick={() => void runSafetyCheck()} disabled={!articleId || running}>
                            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Run Safety Check
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {!articleId ? (
                    <div className="rounded-md border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                        Save this article first to run safety checks.
                    </div>
                ) : null}

                {error ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
                ) : null}

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        {summary ? (
                            <div className="rounded-lg border border-border bg-muted/10 p-3 text-sm">
                                <div className="font-medium text-foreground">
                                    {summary.issueCount} issues found ({summary.mustFixCount} must-fix, {summary.reviewCount} review)
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Unresolved must-fix: {summary.unresolvedMustFixCount}
                                    {review ? ` • Last run ${new Date(review.createdAt).toLocaleString()}` : ""}
                                    {review?.provider ? ` • ${review.provider}` : ""}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-border bg-muted/10 p-3 text-sm text-muted-foreground">
                                No safety review yet. Run Safety Check.
                            </div>
                        )}

                        {stale ? (
                            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                Safety review is stale because the article content changed. Re-run before publishing.
                            </div>
                        ) : null}

                        {mustFixOpen > 0 ? (
                            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 space-y-2">
                                <div className="text-sm font-medium text-red-900 flex items-center gap-2">
                                    <ShieldAlert className="h-4 w-4" />
                                    Publishing is blocked until must-fix issues are resolved or overridden.
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="globalOverride" className="text-xs text-red-900">
                                        Optional global override reason (logged for compliance)
                                    </Label>
                                    <Textarea
                                        id="globalOverride"
                                        value={globalOverrideReason}
                                        onChange={(e) => setGlobalOverrideReason(e.target.value)}
                                        rows={2}
                                        placeholder="Reason for overriding all unresolved must-fix flags"
                                    />
                                    <div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => void overrideAllMustFix()}
                                            disabled={saving === "OVERRIDE_ALL"}
                                        >
                                            {saving === "OVERRIDE_ALL" ? "Applying..." : "Override all must-fix"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {flags.length ? (
                            <div className="space-y-3">
                                {flags.map((flag) => {
                                    const meta = SEVERITY_META[flag.severity];
                                    const approved = Boolean(flag.reviewedApproved);

                                    return (
                                        <div key={flag.id} className="rounded-lg border border-border p-3 space-y-3">
                                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge className={meta.badgeClass}>{meta.label}</Badge>
                                                    <Badge variant="outline">{flag.category}</Badge>
                                                    {approved ? <Badge className="bg-emerald-600">Approved</Badge> : null}
                                                </div>
                                            </div>

                                            <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
                                                <div className="text-xs text-muted-foreground mb-1">Flagged passage</div>
                                                <div className="text-foreground">{flag.flaggedText}</div>
                                            </div>

                                            <div className="text-sm">
                                                <div>
                                                    <span className="font-medium text-foreground">Reason:</span> {flag.reason}
                                                </div>
                                                <div className="mt-1">
                                                    <span className="font-medium text-foreground">Suggested fix:</span> {flag.suggestedFix}
                                                </div>
                                                {flag.stateConcern ? (
                                                    <div className="mt-1">
                                                        <span className="font-medium text-foreground">State concern:</span> {flag.stateConcern}
                                                    </div>
                                                ) : null}
                                                {flag.citationNeeded ? (
                                                    <div className="mt-1 text-amber-900">
                                                        <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                                                        Citation likely needed for this claim.
                                                    </div>
                                                ) : null}
                                            </div>

                                            {approved ? (
                                                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                                                    Reviewed and approved
                                                    {flag.reviewedNote ? `: ${flag.reviewedNote}` : ""}
                                                    {flag.reviewedAt
                                                        ? ` • ${new Date(flag.reviewedAt).toLocaleString()}`
                                                        : ""}
                                                </div>
                                            ) : (
                                                <div className="grid gap-2">
                                                    <Label htmlFor={`note-${flag.id}`} className="text-xs">
                                                        Override note (required to approve)
                                                    </Label>
                                                    <Textarea
                                                        id={`note-${flag.id}`}
                                                        value={notesByFlagId[flag.id] || ""}
                                                        onChange={(e) =>
                                                            setNotesByFlagId((prev) => ({
                                                                ...prev,
                                                                [flag.id]: e.target.value,
                                                            }))
                                                        }
                                                        rows={2}
                                                        placeholder="Why this flag is acceptable after review"
                                                    />
                                                    <div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => void approveFlag(flag.id)}
                                                            disabled={saving === flag.id}
                                                        >
                                                            {saving === flag.id ? "Saving..." : "Mark reviewed & approved"}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : null}

                        {disclaimers.length ? (
                            <div className="rounded-lg border border-border p-3 space-y-3">
                                <div className="font-medium text-foreground">Approved disclaimers library</div>
                                <div className="grid gap-2">
                                    {disclaimers.map((item) => (
                                        <div key={item.key} className="rounded-md border border-border bg-muted/10 p-3">
                                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                                <div className="text-sm font-medium text-foreground">{item.title}</div>
                                                <Badge variant="outline">{item.category}</Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">{item.text}</div>
                                            <div className="flex gap-2 mt-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => void navigator.clipboard?.writeText(item.text)}
                                                >
                                                    Copy
                                                </Button>
                                                {onInsertDisclaimer ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => onInsertDisclaimer(item.text)}
                                                    >
                                                        Insert
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

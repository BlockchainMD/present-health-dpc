"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Loader2, RefreshCw, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ContentBriefIntent = "INFORMATIONAL" | "TRANSACTIONAL" | "COMMERCIAL" | "NAVIGATIONAL";
type ContentBriefStatus = "DRAFT" | "APPROVED" | "PUBLISHED" | "ARCHIVED";

type BriefSectionLink = {
    label: string;
    url: string;
    reason?: string;
};

type BriefSubsection = {
    id: string;
    title: string;
    keyPoints: string[];
    suggestedWordCount: number;
    internalLinkOpportunities: BriefSectionLink[];
};

type BriefSection = {
    id: string;
    h2: string;
    keyPoints: string[];
    suggestedWordCount: number;
    internalLinkOpportunities: BriefSectionLink[];
    h3s: BriefSubsection[];
};

type SafetyFlag = {
    sectionId?: string;
    sectionTitle: string;
    severity: "low" | "medium" | "high";
    concerns: string[];
    detail?: string;
    citationNeededClaims?: string[];
    disclaimerSuggestion?: string;
};

type ContentBrief = {
    id: string;
    targetKeyword: string;
    searchIntent: ContentBriefIntent;
    targetAudience: string;
    status: ContentBriefStatus;
    h1Options: unknown;
    metaTitleOptions: unknown;
    metaDescriptionOptions: unknown;
    urlSlugSuggestion: string;
    outline: unknown;
    semanticKeywords: unknown;
    longTailQuestions: unknown;
    faqSuggestions: unknown;
    differentiationAngle: string;
    recommendedWordCount: number;
    schemaRecommendation: unknown;
    safetyFlags: unknown;
    safetyGlobalWarnings: unknown;
    disclaimerSuggestions: unknown;
    selectedH1: string | null;
    selectedMetaTitle: string | null;
    selectedMetaDescription: string | null;
    notes: string | null;
    internalLinkCatalog: unknown;
    generationPrompt: string;
    generationResponse: string;
    safetyPrompt: string;
    safetyResponse: string;
    convertedArticleId: string | null;
    createdAt: string;
    updatedAt: string;
};

const INTENT_OPTIONS: Array<{ value: ContentBriefIntent; label: string }> = [
    { value: "INFORMATIONAL", label: "Informational" },
    { value: "TRANSACTIONAL", label: "Transactional" },
    { value: "COMMERCIAL", label: "Commercial" },
    { value: "NAVIGATIONAL", label: "Navigational" },
];

const STATUS_OPTIONS: Array<{ value: ContentBriefStatus | "ALL"; label: string }> = [
    { value: "ALL", label: "All" },
    { value: "DRAFT", label: "Draft" },
    { value: "APPROVED", label: "Approved" },
    { value: "PUBLISHED", label: "Published" },
    { value: "ARCHIVED", label: "Archived" },
];

function toStringArray(value: unknown) {
    if (!Array.isArray(value)) return [] as string[];
    return value.map((x) => String(x || "").trim()).filter(Boolean);
}

function toSections(value: unknown) {
    if (!Array.isArray(value)) return [] as BriefSection[];
    const sections: BriefSection[] = [];

    for (const item of value) {
        if (!item || typeof item !== "object") continue;
        const obj = item as Record<string, unknown>;

        const section: BriefSection = {
            id: String(obj.id || ""),
            h2: String(obj.h2 || ""),
            keyPoints: Array.isArray(obj.keyPoints)
                ? obj.keyPoints.map((x) => String(x || "").trim()).filter(Boolean)
                : [],
            suggestedWordCount: Number.parseInt(String(obj.suggestedWordCount || "0"), 10) || 0,
            internalLinkOpportunities: Array.isArray(obj.internalLinkOpportunities)
                ? obj.internalLinkOpportunities
                    .filter((x) => x && typeof x === "object")
                    .map((x) => {
                        const link = x as Record<string, unknown>;
                        return {
                            label: String(link.label || ""),
                            url: String(link.url || ""),
                            reason: String(link.reason || "") || undefined,
                        };
                    })
                    .filter((x) => x.url)
                : [],
            h3s: Array.isArray(obj.h3s)
                ? obj.h3s
                    .filter((x) => x && typeof x === "object")
                    .map((x) => {
                        const child = x as Record<string, unknown>;
                        return {
                            id: String(child.id || ""),
                            title: String(child.title || ""),
                            keyPoints: Array.isArray(child.keyPoints)
                                ? child.keyPoints.map((k) => String(k || "").trim()).filter(Boolean)
                                : [],
                            suggestedWordCount: Number.parseInt(String(child.suggestedWordCount || "0"), 10) || 0,
                            internalLinkOpportunities: Array.isArray(child.internalLinkOpportunities)
                                ? child.internalLinkOpportunities
                                    .filter((m) => m && typeof m === "object")
                                    .map((m) => {
                                        const lk = m as Record<string, unknown>;
                                        return {
                                            label: String(lk.label || ""),
                                            url: String(lk.url || ""),
                                            reason: String(lk.reason || "") || undefined,
                                        };
                                    })
                                    .filter((lk) => lk.url)
                                : [],
                        };
                    })
                : [],
        };

        if (!section.id || !section.h2) continue;
        sections.push(section);
    }

    return sections;
}

function toSafetyFlags(value: unknown) {
    if (!Array.isArray(value)) return [] as SafetyFlag[];
    return value
        .filter((x) => x && typeof x === "object")
        .map((x) => {
            const item = x as Record<string, unknown>;
            return {
                sectionId: String(item.sectionId || "") || undefined,
                sectionTitle: String(item.sectionTitle || ""),
                severity: (["low", "medium", "high"].includes(String(item.severity || "").toLowerCase())
                    ? String(item.severity).toLowerCase()
                    : "medium") as SafetyFlag["severity"],
                concerns: Array.isArray(item.concerns)
                    ? item.concerns.map((m) => String(m || "").trim()).filter(Boolean)
                    : [],
                detail: String(item.detail || "") || undefined,
                citationNeededClaims: Array.isArray(item.citationNeededClaims)
                    ? item.citationNeededClaims.map((m) => String(m || "").trim()).filter(Boolean)
                    : undefined,
                disclaimerSuggestion: String(item.disclaimerSuggestion || "") || undefined,
            };
        })
        .filter((x) => x.sectionTitle || x.sectionId);
}

function asPrettyJson(value: unknown) {
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return "[]";
    }
}

function splitLines(value: string) {
    return value
        .split(/\n/g)
        .map((line) => line.trim())
        .filter(Boolean);
}

function statusBadge(status: ContentBriefStatus) {
    if (status === "APPROVED") return <Badge className="bg-emerald-600">Approved</Badge>;
    if (status === "PUBLISHED") return <Badge className="bg-blue-600">Published</Badge>;
    if (status === "ARCHIVED") return <Badge variant="outline">Archived</Badge>;
    return <Badge variant="secondary">Draft</Badge>;
}

export function ContentBriefManager() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [briefs, setBriefs] = useState<ContentBrief[]>([]);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<ContentBriefStatus | "ALL">("ALL");

    const [targetKeyword, setTargetKeyword] = useState("");
    const [searchIntent, setSearchIntent] = useState<ContentBriefIntent>("INFORMATIONAL");
    const [targetAudience, setTargetAudience] = useState("");
    const [generating, setGenerating] = useState(false);

    const [selectedId, setSelectedId] = useState<string>("");
    const [editing, setEditing] = useState<ContentBrief | null>(null);
    const [saving, setSaving] = useState(false);
    const [converting, setConverting] = useState(false);

    const [outlineJson, setOutlineJson] = useState("[]");

    const selected = useMemo(() => briefs.find((b) => b.id === selectedId) || null, [briefs, selectedId]);
    const focusedBriefId = searchParams.get("brief") || "";

    useEffect(() => {
        if (!focusedBriefId) return;
        setSelectedId(focusedBriefId);
    }, [focusedBriefId]);

    useEffect(() => {
        const handle = setTimeout(() => {
            void loadBriefs();
        }, 250);
        return () => clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, statusFilter]);

    useEffect(() => {
        if (!selectedId) {
            setEditing(null);
            setOutlineJson("[]");
            return;
        }
        if (!selected) return;
        setEditing(selected);
        setOutlineJson(asPrettyJson(selected.outline));
    }, [selected, selectedId]);

    async function loadBriefs() {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (search.trim()) params.set("q", search.trim());
            if (statusFilter !== "ALL") params.set("status", statusFilter);
            params.set("limit", "150");

            const res = await fetch(`/api/admin/content-briefs?${params.toString()}`, { cache: "no-store" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to load briefs");

            const list = Array.isArray(data.briefs) ? (data.briefs as ContentBrief[]) : [];
            setBriefs(list);

            if (selectedId) {
                const exists = list.some((x) => x.id === selectedId);
                if (!exists) setSelectedId("");
            }
        } catch (e: any) {
            setError(e?.message || "Failed to load briefs");
        } finally {
            setLoading(false);
        }
    }

    async function generateBrief() {
        if (!targetKeyword.trim()) {
            setError("Target keyword is required");
            return;
        }
        if (!targetAudience.trim()) {
            setError("Target audience is required");
            return;
        }

        setGenerating(true);
        setError(null);

        try {
            const res = await fetch("/api/admin/content-briefs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetKeyword, searchIntent, targetAudience }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Generation failed");

            const brief = data.brief as ContentBrief;
            setBriefs((prev) => [brief, ...prev]);
            setSelectedId(brief.id);
        } catch (e: any) {
            setError(e?.message || "Failed to generate brief");
        } finally {
            setGenerating(false);
        }
    }

    async function saveBrief() {
        if (!editing) return;

        let parsedOutline: unknown = editing.outline;
        try {
            parsedOutline = JSON.parse(outlineJson || "[]");
        } catch {
            setError("Outline JSON is invalid.");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const payload = {
                targetKeyword: editing.targetKeyword,
                targetAudience: editing.targetAudience,
                searchIntent: editing.searchIntent,
                status: editing.status,
                selectedH1: editing.selectedH1 || null,
                selectedMetaTitle: editing.selectedMetaTitle || null,
                selectedMetaDescription: editing.selectedMetaDescription || null,
                notes: editing.notes || null,
                urlSlugSuggestion: editing.urlSlugSuggestion,
                differentiationAngle: editing.differentiationAngle,
                recommendedWordCount: editing.recommendedWordCount,
                h1Options: editing.h1Options,
                metaTitleOptions: editing.metaTitleOptions,
                metaDescriptionOptions: editing.metaDescriptionOptions,
                semanticKeywords: editing.semanticKeywords,
                longTailQuestions: editing.longTailQuestions,
                faqSuggestions: editing.faqSuggestions,
                schemaRecommendation: editing.schemaRecommendation,
                safetyGlobalWarnings: editing.safetyGlobalWarnings,
                disclaimerSuggestions: editing.disclaimerSuggestions,
                outline: parsedOutline,
            };

            const res = await fetch(`/api/admin/content-briefs/${editing.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Save failed");

            const updated = data.brief as ContentBrief;
            setBriefs((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
            setEditing(updated);
            setOutlineJson(asPrettyJson(updated.outline));
        } catch (e: any) {
            setError(e?.message || "Failed to save brief");
        } finally {
            setSaving(false);
        }
    }

    async function convertToDraft() {
        if (!editing) return;

        setConverting(true);
        setError(null);

        try {
            const res = await fetch(`/api/admin/content-briefs/${editing.id}/convert`, { method: "POST" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Conversion failed");

            const articleId = data.article?.id;
            if (articleId) {
                await loadBriefs();
                router.push(`/admin/learn/${articleId}`);
                return;
            }
            await loadBriefs();
        } catch (e: any) {
            setError(e?.message || "Failed to convert brief");
        } finally {
            setConverting(false);
        }
    }

    const sections = useMemo(() => toSections(editing?.outline || []), [editing?.outline]);
    const safetyFlags = useMemo(() => toSafetyFlags(editing?.safetyFlags || []), [editing?.safetyFlags]);

    function setLineArrayField(
        key:
            | "h1Options"
            | "metaTitleOptions"
            | "metaDescriptionOptions"
            | "semanticKeywords"
            | "longTailQuestions"
            | "faqSuggestions"
            | "schemaRecommendation"
            | "safetyGlobalWarnings"
            | "disclaimerSuggestions",
        value: string
    ) {
        if (!editing) return;
        const next = splitLines(value);
        setEditing({ ...editing, [key]: next });
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Content Brief Generator</h1>
                    <p className="text-sm text-muted-foreground">
                        Generate and edit publish-ready DPC/telehealth briefs with section-level safety checks.
                    </p>
                </div>
                <Button variant="outline" onClick={() => void loadBriefs()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
            ) : null}

            <Card className="border-border/60">
                <CardHeader>
                    <CardTitle className="text-lg">Generate a new brief</CardTitle>
                    <CardDescription>
                        Server-side LLM calls: Claude first, OpenAI fallback. Prompt/response are saved for audit.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="keyword">Target keyword</Label>
                        <Input
                            id="keyword"
                            value={targetKeyword}
                            onChange={(e) => setTargetKeyword(e.target.value)}
                            placeholder="telehealth direct primary care"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="intent">Search intent</Label>
                        <select
                            id="intent"
                            value={searchIntent}
                            onChange={(e) => setSearchIntent(e.target.value as ContentBriefIntent)}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                            {INTENT_OPTIONS.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-2 md:col-span-2">
                        <Label htmlFor="audience">Target audience description</Label>
                        <Textarea
                            id="audience"
                            value={targetAudience}
                            onChange={(e) => setTargetAudience(e.target.value)}
                            rows={3}
                            placeholder="Adults comparing DPC vs insurance who want transparent costs and continuity of care"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <Button onClick={() => void generateBrief()} disabled={generating}>
                            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <WandSparkles className="h-4 w-4 mr-2" />}
                            {generating ? "Generating..." : "Generate brief"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[360px_1fr] items-start">
                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle className="text-lg">Saved briefs</CardTitle>
                        <CardDescription>Search and open existing briefs.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search keyword, audience, notes..."
                        />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as ContentBriefStatus | "ALL")}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                        >
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : briefs.length ? (
                            <div className="grid gap-2 max-h-[70vh] overflow-y-auto pr-1">
                                {briefs.map((brief) => (
                                    <button
                                        key={brief.id}
                                        type="button"
                                        onClick={() => setSelectedId(brief.id)}
                                        className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                                            selectedId === brief.id
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:bg-muted/40"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="truncate font-medium text-foreground">{brief.targetKeyword}</div>
                                            {statusBadge(brief.status)}
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            {brief.searchIntent} | Updated {new Date(brief.updatedAt).toLocaleString()}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-md border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                                No briefs found.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {editing ? (
                    <div className="space-y-6">
                        <Card className="border-border/60">
                            <CardHeader className="flex-row items-start justify-between gap-4 flex-wrap">
                                <div>
                                    <CardTitle className="text-lg">Brief editor</CardTitle>
                                    <CardDescription>ID: {editing.id}</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => void convertToDraft()} disabled={converting}>
                                        {converting ? "Converting..." : "Convert to draft"}
                                    </Button>
                                    <Button onClick={() => void saveBrief()} disabled={saving}>
                                        {saving ? "Saving..." : "Save brief"}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="grid gap-5">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label>Target keyword</Label>
                                        <Input
                                            value={editing.targetKeyword}
                                            onChange={(e) =>
                                                setEditing({ ...editing, targetKeyword: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>Status</Label>
                                        <select
                                            value={editing.status}
                                            onChange={(e) =>
                                                setEditing({
                                                    ...editing,
                                                    status: e.target.value as ContentBriefStatus,
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
                                </div>

                                <div className="grid gap-2">
                                    <Label>Search intent</Label>
                                    <select
                                        value={editing.searchIntent}
                                        onChange={(e) =>
                                            setEditing({ ...editing, searchIntent: e.target.value as ContentBriefIntent })
                                        }
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        {INTENT_OPTIONS.map((item) => (
                                            <option key={item.value} value={item.value}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid gap-2">
                                    <Label>Target audience</Label>
                                    <Textarea
                                        value={editing.targetAudience}
                                        onChange={(e) =>
                                            setEditing({ ...editing, targetAudience: e.target.value })
                                        }
                                        rows={3}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Recommended H1 options (one per line)</Label>
                                    <Textarea
                                        value={toStringArray(editing.h1Options).join("\n")}
                                        onChange={(e) => setLineArrayField("h1Options", e.target.value)}
                                        rows={4}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Meta title options (55-60 chars, one per line)</Label>
                                    <Textarea
                                        value={toStringArray(editing.metaTitleOptions).join("\n")}
                                        onChange={(e) => setLineArrayField("metaTitleOptions", e.target.value)}
                                        rows={4}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Meta description options (150-160 chars, one per line)</Label>
                                    <Textarea
                                        value={toStringArray(editing.metaDescriptionOptions).join("\n")}
                                        onChange={(e) =>
                                            setLineArrayField("metaDescriptionOptions", e.target.value)
                                        }
                                        rows={4}
                                    />
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label>Selected H1</Label>
                                        <Input
                                            value={editing.selectedH1 || ""}
                                            onChange={(e) =>
                                                setEditing({ ...editing, selectedH1: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>URL slug suggestion</Label>
                                        <Input
                                            value={editing.urlSlugSuggestion}
                                            onChange={(e) =>
                                                setEditing({ ...editing, urlSlugSuggestion: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label>Selected meta title</Label>
                                        <Input
                                            value={editing.selectedMetaTitle || ""}
                                            onChange={(e) =>
                                                setEditing({
                                                    ...editing,
                                                    selectedMetaTitle: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Recommended word count</Label>
                                        <Input
                                            type="number"
                                            min={300}
                                            value={editing.recommendedWordCount}
                                            onChange={(e) =>
                                                setEditing({
                                                    ...editing,
                                                    recommendedWordCount:
                                                        Number.parseInt(e.target.value, 10) || 0,
                                                })
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label>Selected meta description</Label>
                                    <Textarea
                                        value={editing.selectedMetaDescription || ""}
                                        onChange={(e) =>
                                            setEditing({
                                                ...editing,
                                                selectedMetaDescription: e.target.value,
                                            })
                                        }
                                        rows={3}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Differentiation angle</Label>
                                    <Textarea
                                        value={editing.differentiationAngle}
                                        onChange={(e) =>
                                            setEditing({ ...editing, differentiationAngle: e.target.value })
                                        }
                                        rows={3}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Schema recommendation (one per line: Article, HowTo, FAQPage)</Label>
                                    <Textarea
                                        value={toStringArray(editing.schemaRecommendation).join("\n")}
                                        onChange={(e) => setLineArrayField("schemaRecommendation", e.target.value)}
                                        rows={3}
                                    />
                                </div>

                                <div className="grid gap-2 md:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label>Semantic keywords (one per line)</Label>
                                        <Textarea
                                            value={toStringArray(editing.semanticKeywords).join("\n")}
                                            onChange={(e) =>
                                                setLineArrayField("semanticKeywords", e.target.value)
                                            }
                                            rows={8}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Long-tail questions (one per line)</Label>
                                        <Textarea
                                            value={toStringArray(editing.longTailQuestions).join("\n")}
                                            onChange={(e) =>
                                                setLineArrayField("longTailQuestions", e.target.value)
                                            }
                                            rows={8}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label>FAQ suggestions (one per line)</Label>
                                    <Textarea
                                        value={toStringArray(editing.faqSuggestions).join("\n")}
                                        onChange={(e) => setLineArrayField("faqSuggestions", e.target.value)}
                                        rows={6}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Outline JSON (editable)</Label>
                                    <Textarea
                                        value={outlineJson}
                                        onChange={(e) => setOutlineJson(e.target.value)}
                                        rows={18}
                                        className="font-mono text-xs"
                                    />
                                </div>

                                <div className="grid gap-2 md:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label>Global safety warnings (one per line)</Label>
                                        <Textarea
                                            value={toStringArray(editing.safetyGlobalWarnings).join("\n")}
                                            onChange={(e) =>
                                                setLineArrayField("safetyGlobalWarnings", e.target.value)
                                            }
                                            rows={5}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Disclaimer suggestions (one per line)</Label>
                                        <Textarea
                                            value={toStringArray(editing.disclaimerSuggestions).join("\n")}
                                            onChange={(e) =>
                                                setLineArrayField("disclaimerSuggestions", e.target.value)
                                            }
                                            rows={5}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label>Editorial notes</Label>
                                    <Textarea
                                        value={editing.notes || ""}
                                        onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                                        rows={4}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border/60">
                            <CardHeader>
                                <CardTitle className="text-lg">Safety flags by section</CardTitle>
                                <CardDescription>
                                    Yellow badges highlight sections with potential medical advice, scope, or citation-risk issues.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {sections.length ? (
                                    sections.map((section) => {
                                        const flags = safetyFlags.filter(
                                            (flag) =>
                                                (flag.sectionId && flag.sectionId === section.id) ||
                                                flag.sectionTitle.toLowerCase() === section.h2.toLowerCase()
                                        );

                                        return (
                                            <div key={section.id} className="rounded-lg border border-border p-4 space-y-3">
                                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                                    <div>
                                                        <div className="font-medium text-foreground">{section.h2}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Target words: {section.suggestedWordCount}
                                                        </div>
                                                    </div>
                                                    {flags.length ? (
                                                        <Badge className="bg-amber-500 text-black">
                                                            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                                                            {flags.length} warning{flags.length === 1 ? "" : "s"}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline">No flags</Badge>
                                                    )}
                                                </div>

                                                {flags.length ? (
                                                    <div className="space-y-2">
                                                        {flags.map((flag, idx) => (
                                                            <div
                                                                key={`${section.id}-flag-${idx}`}
                                                                className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                                                            >
                                                                <div className="font-medium uppercase tracking-wide">
                                                                    {flag.severity} risk
                                                                </div>
                                                                {flag.concerns?.length ? (
                                                                    <div>Concerns: {flag.concerns.join(", ")}</div>
                                                                ) : null}
                                                                {flag.detail ? <div>{flag.detail}</div> : null}
                                                                {flag.citationNeededClaims?.length ? (
                                                                    <div>
                                                                        Citation-needed claims: {flag.citationNeededClaims.join("; ")}
                                                                    </div>
                                                                ) : null}
                                                                {flag.disclaimerSuggestion ? (
                                                                    <div>
                                                                        Disclaimer suggestion: {flag.disclaimerSuggestion}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : null}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="rounded-md border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                                        No outline sections available.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-border/60">
                            <CardHeader>
                                <CardTitle className="text-lg">LLM audit log</CardTitle>
                                <CardDescription>
                                    Stored server-side prompts/responses for generation and safety review.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <details className="rounded-md border border-border bg-muted/20 p-3">
                                    <summary className="cursor-pointer text-sm font-medium">Generation prompt</summary>
                                    <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs">
                                        {editing.generationPrompt || "(none)"}
                                    </pre>
                                </details>
                                <details className="rounded-md border border-border bg-muted/20 p-3">
                                    <summary className="cursor-pointer text-sm font-medium">Generation response</summary>
                                    <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs">
                                        {editing.generationResponse || "(none)"}
                                    </pre>
                                </details>
                                <details className="rounded-md border border-border bg-muted/20 p-3">
                                    <summary className="cursor-pointer text-sm font-medium">Safety prompt</summary>
                                    <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs">
                                        {editing.safetyPrompt || "(none)"}
                                    </pre>
                                </details>
                                <details className="rounded-md border border-border bg-muted/20 p-3">
                                    <summary className="cursor-pointer text-sm font-medium">Safety response</summary>
                                    <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs">
                                        {editing.safetyResponse || "(none)"}
                                    </pre>
                                </details>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <Card className="border-border/60">
                        <CardContent className="py-14 text-center text-muted-foreground">
                            Select a brief to edit, or generate a new one.
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

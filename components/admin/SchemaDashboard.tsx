"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SchemaBlock } from "@/lib/schema";

type SchemaAuditRecord = {
    path: string;
    pageType: string;
    label: string;
    schemaTypes: string[];
    missing: boolean;
    issues: string[];
    blocks: SchemaBlock[];
};

type SchemaSummary = {
    total: number;
    missing: number;
    mismatched: number;
};

export function SchemaDashboard() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<SchemaSummary>({ total: 0, missing: 0, mismatched: 0 });
    const [records, setRecords] = useState<SchemaAuditRecord[]>([]);
    const [filter, setFilter] = useState<"all" | "issues" | "missing">("all");
    const [previewPath, setPreviewPath] = useState<string>("");
    const [previewBlocks, setPreviewBlocks] = useState<SchemaBlock[] | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [regenerating, setRegenerating] = useState(false);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/schema/report", { cache: "no-store" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to load schema report");
            setSummary(data.summary || { total: 0, missing: 0, mismatched: 0 });
            setRecords(Array.isArray(data.records) ? data.records : []);
        } catch (e: any) {
            setError(e?.message || "Failed to load schema report");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    async function regenerateAll() {
        setRegenerating(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/schema/regenerate", { method: "POST" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to regenerate schema");
            await load();
        } catch (e: any) {
            setError(e?.message || "Failed to regenerate schema");
        } finally {
            setRegenerating(false);
        }
    }

    async function loadPreview(path: string) {
        setPreviewLoading(true);
        setPreviewPath(path);
        try {
            const res = await fetch(`/api/admin/schema/preview?path=${encodeURIComponent(path)}`, { cache: "no-store" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to load preview");
            setPreviewBlocks(Array.isArray(data.blocks) ? data.blocks : []);
        } catch (e: any) {
            setError(e?.message || "Failed to load preview");
            setPreviewBlocks(null);
        } finally {
            setPreviewLoading(false);
        }
    }

    const filteredRecords = useMemo(() => {
        if (filter === "missing") return records.filter((r) => r.missing);
        if (filter === "issues") return records.filter((r) => r.issues.length > 0);
        return records;
    }, [records, filter]);

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Schema Manager</h1>
                    <p className="text-sm text-muted-foreground">
                        Centralized JSON-LD generation and validation across public pages.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => void load()} disabled={loading}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button onClick={() => void regenerateAll()} disabled={regenerating}>
                        {regenerating ? "Regenerating..." : "Regenerate all"}
                    </Button>
                </div>
            </div>

            {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle className="text-base">Managed pages</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">{summary.total}</CardContent>
                </Card>
                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle className="text-base">Missing schema</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">{summary.missing}</CardContent>
                </Card>
                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle className="text-base">Mismatch flags</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">{summary.mismatched}</CardContent>
                </Card>
            </div>

            <Card className="border-border/60">
                <CardHeader className="flex-row items-center justify-between gap-4 flex-wrap">
                    <CardTitle className="text-lg">Validation dashboard</CardTitle>
                    <div className="flex gap-2">
                        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
                            All
                        </Button>
                        <Button variant={filter === "issues" ? "default" : "outline"} size="sm" onClick={() => setFilter("issues")}>
                            Issues
                        </Button>
                        <Button variant={filter === "missing" ? "default" : "outline"} size="sm" onClick={() => setFilter("missing")}>
                            Missing
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredRecords.length ? (
                        <div className="space-y-3">
                            {filteredRecords.map((record) => (
                                <div key={record.path} className="rounded-lg border border-border p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <div>
                                            <div className="font-medium text-foreground">{record.label}</div>
                                            <div className="text-xs font-mono text-muted-foreground">{record.path}</div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="outline">{record.pageType}</Badge>
                                            {record.missing ? <Badge variant="destructive">Missing schema</Badge> : null}
                                            {record.issues.length > 0 ? <Badge className="bg-amber-600">Mismatch flagged</Badge> : null}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div className="flex gap-2 flex-wrap">
                                            {record.schemaTypes.map((type) => (
                                                <Badge key={`${record.path}-${type}`} variant="secondary">
                                                    {type}
                                                </Badge>
                                            ))}
                                            {record.schemaTypes.length === 0 ? (
                                                <span className="text-sm text-muted-foreground">No schema types.</span>
                                            ) : null}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={record.path} target="_blank">
                                                    Open page
                                                </Link>
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => void loadPreview(record.path)}>
                                                Preview JSON-LD
                                            </Button>
                                        </div>
                                    </div>

                                    {record.issues.length ? (
                                        <ul className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 space-y-1">
                                            {record.issues.map((issue, idx) => (
                                                <li key={`${record.path}-issue-${idx}`}>• {issue}</li>
                                            ))}
                                        </ul>
                                    ) : null}

                                    {previewPath === record.path ? (
                                        <div className="rounded-md border border-border bg-muted/20 p-3">
                                            {previewLoading ? (
                                                <div className="text-sm text-muted-foreground">Loading preview...</div>
                                            ) : (
                                                <pre className="text-xs whitespace-pre-wrap overflow-x-auto">
                                                    {JSON.stringify(previewBlocks, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-md border border-border bg-muted/20 p-8 text-muted-foreground">
                            No records match this filter.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}


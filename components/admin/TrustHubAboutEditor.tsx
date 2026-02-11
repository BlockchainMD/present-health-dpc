"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown } from "@/components/markdown";
import { normalizeMarkdownForRender } from "@/lib/markdown-utils";

type Blocks = {
    practiceOverviewMarkdown: string;
    dpcCoversMarkdown: string;
    dpcDoesntCoverMarkdown: string;
    hipaaPrivacyMarkdown: string;
};

export function TrustHubAboutEditor() {
    const [blocks, setBlocks] = useState<Blocks | null>(null);
    const [status, setStatus] = useState<{ type: "idle" } | { type: "loading" } | { type: "saving" } | { type: "error"; message: string } | { type: "success" }>({
        type: "loading",
    });

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setStatus({ type: "loading" });
            try {
                const res = await fetch("/api/admin/trust-hub/about");
                const data = await res.json().catch(() => null);
                if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to load");
                if (!cancelled) {
                    setBlocks(data.blocks);
                    setStatus({ type: "idle" });
                }
            } catch (error: any) {
                if (!cancelled) setStatus({ type: "error", message: error?.message || "Failed to load" });
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    const preview = useMemo(() => {
        if (!blocks) return null;
        return {
            practiceOverview: normalizeMarkdownForRender(blocks.practiceOverviewMarkdown || ""),
            dpcCovers: normalizeMarkdownForRender(blocks.dpcCoversMarkdown || ""),
            dpcDoesntCover: normalizeMarkdownForRender(blocks.dpcDoesntCoverMarkdown || ""),
            hipaaPrivacy: normalizeMarkdownForRender(blocks.hipaaPrivacyMarkdown || ""),
        };
    }, [blocks]);

    async function save() {
        if (!blocks) return;
        setStatus({ type: "saving" });
        try {
            const res = await fetch("/api/admin/trust-hub/about", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(blocks),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to save");
            setBlocks(data.blocks);
            setStatus({ type: "success" });
            setTimeout(() => setStatus({ type: "idle" }), 1500);
        } catch (error: any) {
            setStatus({ type: "error", message: error?.message || "Failed to save" });
        }
    }

    if (status.type === "loading" && !blocks) {
        return <div className="text-sm text-muted-foreground">Loading…</div>;
    }

    if (status.type === "error" && !blocks) {
        return <div className="text-sm text-red-700">{status.message}</div>;
    }

    if (!blocks || !preview) return null;

    return (
        <div className="max-w-5xl space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Trust Hub (About)</h1>
                    <p className="text-sm text-muted-foreground">
                        Editable content blocks used on <Link href="/about" className="text-primary hover:underline">/about</Link>.
                    </p>
                </div>
                <Button onClick={save} disabled={status.type === "saving"}>
                    {status.type === "saving" ? "Saving…" : "Save"}
                </Button>
            </div>

            {status.type === "error" ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{status.message}</div>
            ) : null}
            {status.type === "success" ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Saved.</div>
            ) : null}

            <Card className="border-border/60">
                <CardHeader>
                    <CardTitle>Practice overview</CardTitle>
                    <CardDescription>Explains what Present Health is and how telehealth-first DPC works.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                    <Label htmlFor="practiceOverview">Markdown</Label>
                    <Textarea
                        id="practiceOverview"
                        rows={10}
                        value={blocks.practiceOverviewMarkdown}
                        onChange={(e) => setBlocks({ ...blocks, practiceOverviewMarkdown: e.target.value })}
                    />
                    <div className="prose dark:prose-invert max-w-none rounded-md border border-border bg-background p-4">
                        <Markdown content={preview.practiceOverview} />
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle>What DPC covers</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Tabs defaultValue="edit">
                            <TabsList>
                                <TabsTrigger value="edit">Edit</TabsTrigger>
                                <TabsTrigger value="preview">Preview</TabsTrigger>
                            </TabsList>
                            <TabsContent value="edit">
                                <Textarea
                                    rows={10}
                                    value={blocks.dpcCoversMarkdown}
                                    onChange={(e) => setBlocks({ ...blocks, dpcCoversMarkdown: e.target.value })}
                                />
                            </TabsContent>
                            <TabsContent value="preview">
                                <div className="prose dark:prose-invert max-w-none rounded-md border border-border bg-background p-4">
                                    <Markdown content={preview.dpcCovers} />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle>What DPC does not cover</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Tabs defaultValue="edit">
                            <TabsList>
                                <TabsTrigger value="edit">Edit</TabsTrigger>
                                <TabsTrigger value="preview">Preview</TabsTrigger>
                            </TabsList>
                            <TabsContent value="edit">
                                <Textarea
                                    rows={10}
                                    value={blocks.dpcDoesntCoverMarkdown}
                                    onChange={(e) => setBlocks({ ...blocks, dpcDoesntCoverMarkdown: e.target.value })}
                                />
                            </TabsContent>
                            <TabsContent value="preview">
                                <div className="prose dark:prose-invert max-w-none rounded-md border border-border bg-background p-4">
                                    <Markdown content={preview.dpcDoesntCover} />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border/60">
                <CardHeader>
                    <CardTitle>HIPAA / Privacy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Tabs defaultValue="edit">
                        <TabsList>
                            <TabsTrigger value="edit">Edit</TabsTrigger>
                            <TabsTrigger value="preview">Preview</TabsTrigger>
                        </TabsList>
                        <TabsContent value="edit">
                            <Textarea
                                rows={10}
                                value={blocks.hipaaPrivacyMarkdown}
                                onChange={(e) => setBlocks({ ...blocks, hipaaPrivacyMarkdown: e.target.value })}
                            />
                        </TabsContent>
                        <TabsContent value="preview">
                            <div className="prose dark:prose-invert max-w-none rounded-md border border-border bg-background p-4">
                                <Markdown content={preview.hipaaPrivacy} />
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}


"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { normalizeMarkdownForRender } from "@/lib/markdown-utils";

type FaqItem = { question: string; answer: string };
type FaqFormItem = { id: string; question: string; answer: string };

function newFaqId() {
    return (globalThis.crypto as any)?.randomUUID?.() ?? `faq_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function withIds(items: FaqItem[]): FaqFormItem[] {
    return (items || []).map((x) => ({ id: newFaqId(), question: x.question || "", answer: x.answer || "" }));
}

export function EmployerFaqEditor() {
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<{ type: "idle" } | { type: "saving" } | { type: "error"; message: string } | { type: "success" }>({
        type: "idle",
    });
    const [faqs, setFaqs] = useState<FaqFormItem[]>([]);

    const total = faqs.length;

    async function load() {
        setLoading(true);
        setStatus({ type: "idle" });
        try {
            const res = await fetch("/api/admin/employers/faq");
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to load FAQs");
            const items = Array.isArray(data.faqs) ? (data.faqs as FaqItem[]) : [];
            setFaqs(withIds(items));
        } catch (e: any) {
            setStatus({ type: "error", message: e?.message || "Failed to load FAQs" });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    function updateFaq(id: string, patch: Partial<Omit<FaqFormItem, "id">>) {
        setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    }

    function removeFaq(id: string) {
        setFaqs((prev) => prev.filter((f) => f.id !== id));
    }

    function moveFaq(id: string, dir: -1 | 1) {
        setFaqs((prev) => {
            const idx = prev.findIndex((f) => f.id === id);
            if (idx < 0) return prev;
            const nextIdx = idx + dir;
            if (nextIdx < 0 || nextIdx >= prev.length) return prev;
            const copy = prev.slice();
            const [item] = copy.splice(idx, 1);
            copy.splice(nextIdx, 0, item);
            return copy;
        });
    }

    async function save() {
        setStatus({ type: "saving" });
        try {
            const payload = {
                faqs: faqs
                    .map(({ question, answer }) => ({ question: question.trim(), answer: answer.trim() }))
                    .filter((x) => Boolean(x.question) && Boolean(x.answer)),
            };

            const res = await fetch("/api/admin/employers/faq", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Save failed");

            const items = Array.isArray(data.faqs) ? (data.faqs as FaqItem[]) : payload.faqs;
            setFaqs(withIds(items));
            setStatus({ type: "success" });
        } catch (e: any) {
            setStatus({ type: "error", message: e?.message || "Save failed" });
        }
    }

    const previewMarkdown = useMemo(() => {
        const items = faqs
            .map((f, idx) => {
                const q = f.question.trim();
                const a = f.answer.trim();
                if (!q || !a) return null;
                return `### ${idx + 1}. ${q}\n\n${a}`;
            })
            .filter(Boolean)
            .join("\n\n");
        return normalizeMarkdownForRender(items);
    }, [faqs]);

    return (
        <div className="max-w-6xl space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Employer FAQs</h1>
                    <p className="text-sm text-muted-foreground">
                        These render on <Link href="/for-employers" target="_blank" className="text-primary hover:underline">/for-employers</Link>. Answers support Markdown.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => void load()} disabled={loading || status.type === "saving"}>
                        Reload
                    </Button>
                    <Button onClick={() => void save()} disabled={loading || status.type === "saving"}>
                        {status.type === "saving" ? "Saving..." : "Save"}
                    </Button>
                </div>
            </div>

            {status.type === "error" ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{status.message}</div>
            ) : null}
            {status.type === "success" ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Saved.</div>
            ) : null}

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>FAQ items</CardTitle>
                            <CardDescription>Add, edit, remove, and reorder. Only complete Q/A pairs are saved.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="text-sm text-muted-foreground">{total} items</div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setFaqs((prev) => [{ id: newFaqId(), question: "", answer: "" }, ...prev])}
                                >
                                    Add FAQ
                                </Button>
                            </div>

                            <div className="grid gap-4">
                                {faqs.map((f, idx) => (
                                    <Card key={f.id} className="border-border/60">
                                        <CardHeader className="flex-row items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <CardTitle className="text-sm">FAQ #{idx + 1}</CardTitle>
                                                <div className="text-xs text-muted-foreground">Reorder with the buttons on the right.</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button type="button" variant="outline" size="sm" onClick={() => moveFaq(f.id, -1)} disabled={idx === 0}>
                                                    Up
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => moveFaq(f.id, 1)} disabled={idx === faqs.length - 1}>
                                                    Down
                                                </Button>
                                                <Button type="button" variant="destructive" size="sm" onClick={() => removeFaq(f.id)}>
                                                    Remove
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="grid gap-3">
                                            <div className="grid gap-2">
                                                <Label>Question</Label>
                                                <Input value={f.question} onChange={(e) => updateFaq(f.id, { question: e.target.value })} placeholder="e.g., Do employers still need insurance?" />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Answer (Markdown)</Label>
                                                <Textarea value={f.answer} onChange={(e) => updateFaq(f.id, { answer: e.target.value })} rows={4} />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 lg:sticky lg:top-8">
                        <CardHeader>
                            <CardTitle>Preview</CardTitle>
                            <CardDescription>Approximate rendering of the FAQ section.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="rendered">
                                <TabsList>
                                    <TabsTrigger value="rendered">Rendered</TabsTrigger>
                                    <TabsTrigger value="markdown">Markdown</TabsTrigger>
                                </TabsList>
                                <TabsContent value="rendered">
                                    <div className="prose prose-sm max-w-none dark:prose-invert rounded-md border border-border bg-background p-4">
                                        {previewMarkdown.trim() ? <Markdown content={previewMarkdown} /> : <p className="text-muted-foreground">Nothing to preview yet.</p>}
                                    </div>
                                </TabsContent>
                                <TabsContent value="markdown">
                                    <pre className="text-xs whitespace-pre-wrap rounded-md border border-border bg-background p-4">
                                        {previewMarkdown.trim() || "(empty)"}
                                    </pre>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}


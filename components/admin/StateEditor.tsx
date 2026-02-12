"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { slugify } from "@/lib/slug";
import { Markdown } from "@/components/markdown";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FaqItem = { question: string; answer: string };
type FaqFormItem = { id: string; question: string; answer: string };

export type StateFormValue = {
    id?: string;
    name: string;
    slug: string;
    isActive: boolean;
    metaTitle: string;
    metaDescription: string;
    telehealthRegulationsSummary: string;
    rxLogistics: string;
    labOptions: string;
    emergencyProtocol: string;
    hsaNotes: string;
    faqs: FaqItem[];
};

function newFaqId() {
    // Browsers should support crypto.randomUUID(); keep a fallback for safety.
    return (globalThis.crypto as any)?.randomUUID?.() ?? `faq_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function withFaqIds(items: FaqItem[]): FaqFormItem[] {
    return (items || []).map((x) => ({ id: newFaqId(), question: x.question || "", answer: x.answer || "" }));
}

export function StateEditor({ initial }: { initial?: Partial<StateFormValue> }) {
    const router = useRouter();

    const [name, setName] = useState(initial?.name || "");
    const [slug, setSlug] = useState(initial?.slug || "");
    const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));

    const [isActive, setIsActive] = useState(Boolean(initial?.isActive));

    const [metaTitle, setMetaTitle] = useState(initial?.metaTitle || "");
    const [metaDescription, setMetaDescription] = useState(initial?.metaDescription || "");

    const [telehealthRegulationsSummary, setTelehealthRegulationsSummary] = useState(initial?.telehealthRegulationsSummary || "");
    const [rxLogistics, setRxLogistics] = useState(initial?.rxLogistics || "");
    const [labOptions, setLabOptions] = useState(initial?.labOptions || "");
    const [emergencyProtocol, setEmergencyProtocol] = useState(initial?.emergencyProtocol || "");
    const [hsaNotes, setHsaNotes] = useState(initial?.hsaNotes || "");

    const [faqs, setFaqs] = useState<FaqFormItem[]>(withFaqIds((initial?.faqs as any) || []));

    const [status, setStatus] = useState<{ type: "idle" } | { type: "saving" } | { type: "error"; message: string } | { type: "success" }>({
        type: "idle",
    });

    const isEdit = Boolean(initial?.id);

    const publicUrl = useMemo(() => `/states/${slug || "..."}`, [slug]);
    const defaultMetaTitle = useMemo(() => (name.trim() ? `Telehealth Direct Primary Care in ${name.trim()} | Present Health` : ""), [name]);
    const defaultMetaDescription = useMemo(
        () =>
            name.trim()
                ? `Messaging-first primary care for ${name.trim()} residents. Present Health memberships are $49/month with no insurance required.`
                : "",
        [name]
    );

    function onNameChange(nextName: string) {
        setName(nextName);
        if (!slugTouched) setSlug(slugify(nextName));
    }

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

        const payload = {
            name: name.trim(),
            slug: slug.trim(),
            isActive,
            metaTitle: metaTitle.trim(),
            metaDescription: metaDescription.trim(),
            telehealthRegulationsSummary,
            rxLogistics,
            labOptions,
            emergencyProtocol,
            hsaNotes,
            faqs: faqs
                .map(({ question, answer }) => ({ question: question.trim(), answer: answer.trim() }))
                .filter((f) => Boolean(f.question) && Boolean(f.answer)),
        };

        try {
            const res = await fetch(isEdit ? `/api/admin/states/${initial!.id}` : "/api/admin/states", {
                method: isEdit ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Save failed");
            }

            setStatus({ type: "success" });

            if (!isEdit) {
                router.push(`/admin/states/${data.state.id}`);
            } else {
                router.refresh();
            }
        } catch (error: any) {
            setStatus({ type: "error", message: error?.message || "Save failed" });
        }
    }

    async function remove() {
        if (!isEdit) return;
        if (!confirm("Delete this state page? This cannot be undone.")) return;

        setStatus({ type: "saving" });
        try {
            const res = await fetch(`/api/admin/states/${initial!.id}`, { method: "DELETE" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Delete failed");
            router.push("/admin/states");
        } catch (error: any) {
            setStatus({ type: "error", message: error?.message || "Delete failed" });
        }
    }

    return (
        <div className="max-w-6xl space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{isEdit ? "Edit state" : "New state"}</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage state pages shown on <Link href="/states" className="text-primary hover:underline">/states</Link>.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={save} disabled={status.type === "saving"}>
                        {status.type === "saving" ? "Saving..." : "Save"}
                    </Button>
                    {isEdit ? (
                        <Button variant="destructive" onClick={remove} disabled={status.type === "saving"}>
                            Delete
                        </Button>
                    ) : null}
                </div>
            </div>

            {status.type === "error" ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{status.message}</div>
            ) : null}
            {status.type === "success" ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Saved.</div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle>State Page</CardTitle>
                        <CardDescription>SEO metadata, content blocks, FAQs, and activation.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="name">State name</Label>
                                <Input id="name" value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Michigan" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="slug">State slug</Label>
                                <Input
                                    id="slug"
                                    value={slug}
                                    onChange={(e) => {
                                        setSlugTouched(true);
                                        setSlug(e.target.value);
                                    }}
                                    placeholder="michigan"
                                />
                                <div className="text-xs text-muted-foreground">
                                    Public URL: <span className="font-mono">{publicUrl}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
                            <div>
                                <div className="font-medium text-foreground">Public listing</div>
                                <div className="text-xs text-muted-foreground">Toggle off to hide from /states and return 404 on the public route.</div>
                            </div>
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                        </div>

                        <Card className="border-border/60">
                            <CardHeader className="pb-0">
                                <CardTitle className="text-base">SEO</CardTitle>
                                <CardDescription>Optional overrides. If blank, defaults are used.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="metaTitle">Meta title</Label>
                                    <Input id="metaTitle" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={defaultMetaTitle || "Telehealth Direct Primary Care in [State] | Present Health"} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="metaDescription">Meta description</Label>
                                    <Textarea
                                        id="metaDescription"
                                        value={metaDescription}
                                        onChange={(e) => setMetaDescription(e.target.value)}
                                        rows={3}
                                        placeholder={defaultMetaDescription || "Default description pattern..."}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid gap-6">
                            <Card className="border-border/60">
                                <CardHeader className="pb-0">
                                    <CardTitle className="text-base">How It Works</CardTitle>
                                    <CardDescription>Rendered as Markdown under “How It Works in [State]”.</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <Tabs defaultValue="edit">
                                        <TabsList>
                                            <TabsTrigger value="edit">Edit</TabsTrigger>
                                            <TabsTrigger value="preview">Preview</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="edit">
                                            <Textarea value={telehealthRegulationsSummary} onChange={(e) => setTelehealthRegulationsSummary(e.target.value)} rows={10} />
                                        </TabsContent>
                                        <TabsContent value="preview">
                                            <div className="prose dark:prose-invert max-w-none rounded-md border border-border bg-background p-4">
                                                {telehealthRegulationsSummary.trim() ? <Markdown content={telehealthRegulationsSummary} /> : <p className="text-muted-foreground">Nothing to preview yet.</p>}
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>

                            <div className="grid gap-6 md:grid-cols-2">
                                <Card className="border-border/60">
                                    <CardHeader className="pb-0">
                                        <CardTitle className="text-base">Prescriptions &amp; Pharmacy</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <Tabs defaultValue="edit">
                                            <TabsList>
                                                <TabsTrigger value="edit">Edit</TabsTrigger>
                                                <TabsTrigger value="preview">Preview</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="edit">
                                                <Textarea value={rxLogistics} onChange={(e) => setRxLogistics(e.target.value)} rows={10} />
                                            </TabsContent>
                                            <TabsContent value="preview">
                                                <div className="prose dark:prose-invert max-w-none rounded-md border border-border bg-background p-4">
                                                    {rxLogistics.trim() ? <Markdown content={rxLogistics} /> : <p className="text-muted-foreground">Nothing to preview yet.</p>}
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </CardContent>
                                </Card>

                                <Card className="border-border/60">
                                    <CardHeader className="pb-0">
                                        <CardTitle className="text-base">Lab Work</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <Tabs defaultValue="edit">
                                            <TabsList>
                                                <TabsTrigger value="edit">Edit</TabsTrigger>
                                                <TabsTrigger value="preview">Preview</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="edit">
                                                <Textarea value={labOptions} onChange={(e) => setLabOptions(e.target.value)} rows={10} />
                                            </TabsContent>
                                            <TabsContent value="preview">
                                                <div className="prose dark:prose-invert max-w-none rounded-md border border-border bg-background p-4">
                                                    {labOptions.trim() ? <Markdown content={labOptions} /> : <p className="text-muted-foreground">Nothing to preview yet.</p>}
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                <Card className="border-border/60">
                                    <CardHeader className="pb-0">
                                        <CardTitle className="text-base">In an Emergency</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <Tabs defaultValue="edit">
                                            <TabsList>
                                                <TabsTrigger value="edit">Edit</TabsTrigger>
                                                <TabsTrigger value="preview">Preview</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="edit">
                                                <Textarea value={emergencyProtocol} onChange={(e) => setEmergencyProtocol(e.target.value)} rows={10} />
                                            </TabsContent>
                                            <TabsContent value="preview">
                                                <div className="prose dark:prose-invert max-w-none rounded-md border border-border bg-background p-4">
                                                    {emergencyProtocol.trim() ? <Markdown content={emergencyProtocol} /> : <p className="text-muted-foreground">Nothing to preview yet.</p>}
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </CardContent>
                                </Card>

                                <Card className="border-border/60">
                                    <CardHeader className="pb-0">
                                        <CardTitle className="text-base">HSA &amp; Payment</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <Tabs defaultValue="edit">
                                            <TabsList>
                                                <TabsTrigger value="edit">Edit</TabsTrigger>
                                                <TabsTrigger value="preview">Preview</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="edit">
                                                <Textarea value={hsaNotes} onChange={(e) => setHsaNotes(e.target.value)} rows={10} />
                                            </TabsContent>
                                            <TabsContent value="preview">
                                                <div className="prose dark:prose-invert max-w-none rounded-md border border-border bg-background p-4">
                                                    {hsaNotes.trim() ? <Markdown content={hsaNotes} /> : <p className="text-muted-foreground">Nothing to preview yet.</p>}
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <Card className="border-border/60">
                            <CardHeader>
                                <CardTitle className="text-base">FAQs</CardTitle>
                                <CardDescription>Add, edit, remove, and reorder FAQ items. Only complete Q/A pairs are saved.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="text-sm text-muted-foreground">{faqs.length} items</div>
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
                                                    <Input value={f.question} onChange={(e) => updateFaq(f.id, { question: e.target.value })} placeholder={`e.g., Can I use Present Health in ${name || "this state"}?`} />
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
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Preview</CardTitle>
                            <CardDescription>Open the public state page in a new tab.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div>
                                <span className="font-medium text-foreground">URL:</span>{" "}
                                <span className="font-mono">{publicUrl}</span>
                            </div>
                            <Button asChild className="w-full" variant="outline" disabled={!slug.trim()}>
                                <Link href={publicUrl} target="_blank">Open public page</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Default SEO</CardTitle>
                            <CardDescription>These apply when overrides are blank.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <div>
                                <div className="text-xs uppercase tracking-wide">Title</div>
                                <div className="text-foreground">{defaultMetaTitle || "—"}</div>
                            </div>
                            <div>
                                <div className="text-xs uppercase tracking-wide">Description</div>
                                <div className="text-foreground">{defaultMetaDescription || "—"}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

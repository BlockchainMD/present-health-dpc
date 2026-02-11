"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { slugify } from "@/lib/slug";
import { LEARN_CATEGORIES, categoryLabel, isLearnCategorySlug, type LearnCategorySlug } from "@/lib/learn";
import { normalizeMarkdownForRender } from "@/lib/markdown-utils";
import { Markdown } from "@/components/markdown";
import { ArticleSafetyPanel } from "@/components/admin/ArticleSafetyPanel";
import { ArticleRepurposePanel } from "@/components/admin/ArticleRepurposePanel";
import { ArticleRefreshPanel } from "@/components/admin/ArticleRefreshPanel";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PhysicianOption = { id: string; name: string; slug: string; credentials: string | null };

type FaqItem = { question: string; answer: string };
type FaqFormItem = { id: string; question: string; answer: string };

export type LearnArticleFormValue = {
    id?: string;
    title: string;
    slug: string;
    status: "DRAFT" | "READY_FOR_REVIEW" | "PUBLISHED" | "ARCHIVED" | "DISCARDED";
    publishedAt: string; // ISO or ""
    updatedAt?: string;
    metaTitle: string;
    metaDescription: string;
    excerpt: string;
    category: LearnCategorySlug | "";
    schemaType: "Article" | "HowTo" | "FAQPage";
    featuredImage: string;
    authorPhysicianId: string;
    refreshRequested: boolean;
    lastRefreshedAt?: string;
    content: string;
    faqs: FaqItem[];
};

function selectClassName() {
    return "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
}

function newFaqId() {
    return (globalThis.crypto as any)?.randomUUID?.() ?? `faq_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function withFaqIds(items: FaqItem[]): FaqFormItem[] {
    return (items || []).map((x) => ({ id: newFaqId(), question: x.question || "", answer: x.answer || "" }));
}

function toDateTimeLocalValue(date: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDateTimeLocal(value: string) {
    const trimmed = (value || "").trim();
    if (!trimmed) return null;
    const [d, t] = trimmed.split("T");
    if (!d || !t) return null;
    const [y, m, day] = d.split("-").map((x) => Number.parseInt(x, 10));
    const [hh, mm] = t.split(":").map((x) => Number.parseInt(x, 10));
    if (!y || !m || !day) return null;
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return new Date(y, m - 1, day, hh, mm, 0, 0);
}

export function LearnArticleEditor({
    initial,
    physicians,
}: {
    initial?: Partial<LearnArticleFormValue>;
    physicians: PhysicianOption[];
}) {
    const router = useRouter();

    const [title, setTitle] = useState(initial?.title || "");
    const [slug, setSlug] = useState(initial?.slug || "");
    const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));

    const [status, setStatus] = useState<LearnArticleFormValue["status"]>(initial?.status || "DRAFT");
    const [publishedAtLocal, setPublishedAtLocal] = useState(() => {
        if (!initial?.publishedAt) return "";
        const d = new Date(initial.publishedAt);
        return Number.isFinite(d.getTime()) ? toDateTimeLocalValue(d) : "";
    });

    const [metaTitle, setMetaTitle] = useState(initial?.metaTitle || "");
    const [metaDescription, setMetaDescription] = useState(initial?.metaDescription || "");
    const [excerpt, setExcerpt] = useState(initial?.excerpt || "");

    const [category, setCategory] = useState<LearnCategorySlug | "">(
        initial?.category && isLearnCategorySlug(initial.category) ? initial.category : ""
    );
    const [schemaType, setSchemaType] = useState<LearnArticleFormValue["schemaType"]>(initial?.schemaType || "Article");
    const [featuredImage, setFeaturedImage] = useState(initial?.featuredImage || "");
    const [authorPhysicianId, setAuthorPhysicianId] = useState(initial?.authorPhysicianId || "");

    const [refreshRequested, setRefreshRequested] = useState(Boolean(initial?.refreshRequested));
    const lastRefreshedAt = initial?.lastRefreshedAt || "";

    const [content, setContent] = useState(initial?.content || "");
    const [faqs, setFaqs] = useState<FaqFormItem[]>(withFaqIds((initial?.faqs as any) || []));

    const [suggestions, setSuggestions] = useState<{ label: string; url: string; type: string }[]>([]);
    const [suggestionsStatus, setSuggestionsStatus] = useState<"idle" | "loading" | "error">("idle");

    const [statusMsg, setStatusMsg] = useState<
        { type: "idle" } | { type: "saving" } | { type: "error"; message: string } | { type: "success" }
    >({ type: "idle" });

    const isEdit = Boolean(initial?.id);

    const previewContent = useMemo(() => normalizeMarkdownForRender(content || ""), [content]);

    const publicHref = useMemo(() => {
        if (!slug.trim()) return isEdit ? `/learn/${initial!.id}` : "";
        return `/learn/${slug.trim()}`;
    }, [initial, isEdit, slug]);

    function onTitleChange(next: string) {
        setTitle(next);
        if (!slugTouched) setSlug(slugify(next));
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
        setStatusMsg({ type: "saving" });

        const publishAt = parseDateTimeLocal(publishedAtLocal);

        const payload = {
            title: title.trim(),
            slug: slug.trim() || null,
            status,
            publishedAt: publishAt ? publishAt.toISOString() : null,
            metaTitle: metaTitle.trim(),
            metaDescription: metaDescription.trim(),
            excerpt: excerpt.trim(),
            category: category || null,
            schemaType: schemaType || "Article",
            featuredImage: featuredImage.trim() || null,
            authorPhysicianId: authorPhysicianId || null,
            refreshRequested,
            content,
            faqs: faqs
                .map(({ question, answer }) => ({ question: question.trim(), answer: answer.trim() }))
                .filter((f) => Boolean(f.question) && Boolean(f.answer)),
        };

        try {
            const res = await fetch(isEdit ? `/api/admin/articles/${initial!.id}` : "/api/admin/articles", {
                method: isEdit ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Save failed");

            setStatusMsg({ type: "success" });

            if (!isEdit) {
                router.push(`/admin/learn/${data.article.id}`);
            } else {
                window.dispatchEvent(new CustomEvent("article-safety-refresh"));
                window.dispatchEvent(new CustomEvent("article-repurpose-refresh"));
                router.refresh();
            }
        } catch (error: any) {
            setStatusMsg({ type: "error", message: error?.message || "Save failed" });
        }
    }

    async function remove() {
        if (!isEdit) return;
        if (!confirm("Delete this article? This cannot be undone.")) return;
        setStatusMsg({ type: "saving" });
        try {
            const res = await fetch(`/api/admin/articles/${initial!.id}`, { method: "DELETE" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Delete failed");
            router.push("/admin/learn");
        } catch (error: any) {
            setStatusMsg({ type: "error", message: error?.message || "Delete failed" });
        }
    }

    async function uploadFeaturedImage(file: File) {
        if (!isEdit) return;
        setStatusMsg({ type: "saving" });
        try {
            const formData = new FormData();
            formData.set("file", file);
            const res = await fetch(`/api/admin/articles/${initial!.id}/featured-image`, {
                method: "POST",
                body: formData,
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Upload failed");
            setFeaturedImage(data.article.featuredImage || "");
            setStatusMsg({ type: "success" });
            router.refresh();
        } catch (error: any) {
            setStatusMsg({ type: "error", message: error?.message || "Upload failed" });
        }
    }

    async function loadSuggestions() {
        setSuggestionsStatus("loading");
        try {
            const res = await fetch("/api/admin/link-suggestions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: `${title}\n\n${content}`.slice(0, 10000) }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to load suggestions");
            setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
            setSuggestionsStatus("idle");
        } catch {
            setSuggestionsStatus("error");
        }
    }

    useEffect(() => {
        // Load once on mount; user can refresh.
        void loadSuggestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectedPhysician = useMemo(() => {
        return physicians.find((p) => p.id === authorPhysicianId) || null;
    }, [authorPhysicianId, physicians]);

    const scheduledBadge = useMemo(() => {
        const dt = parseDateTimeLocal(publishedAtLocal);
        if (!dt) return null;
        if (status !== "PUBLISHED") return null;
        return dt.getTime() > Date.now() ? `Scheduled for ${dt.toLocaleString()}` : null;
    }, [publishedAtLocal, status]);

    const faqWarning = schemaType === "FAQPage" && faqs.filter((f) => f.question.trim() && f.answer.trim()).length === 0;

    return (
        <div className="max-w-6xl space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{isEdit ? "Edit article" : "New article"}</h1>
                    <p className="text-sm text-muted-foreground">
                        Published content appears under <Link href="/learn" className="text-primary hover:underline">/learn</Link>.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={save} disabled={statusMsg.type === "saving"}>
                        {statusMsg.type === "saving" ? "Saving..." : "Save"}
                    </Button>
                    {isEdit ? (
                        <Button variant="destructive" onClick={remove} disabled={statusMsg.type === "saving"}>
                            Delete
                        </Button>
                    ) : null}
                </div>
            </div>

            {statusMsg.type === "error" ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{statusMsg.message}</div>
            ) : null}
            {statusMsg.type === "success" ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Saved.</div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
                <div className="space-y-6">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Basics</CardTitle>
                            <CardDescription>Title, slug, status, publish date, and author.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Title</Label>
                                <Input id="title" value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="Telehealth direct primary care: what to expect" />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="slug">Slug</Label>
                                <Input
                                    id="slug"
                                    value={slug}
                                    onChange={(e) => {
                                        setSlugTouched(true);
                                        setSlug(e.target.value);
                                    }}
                                    placeholder="telehealth-direct-primary-care"
                                />
                                <div className="text-xs text-muted-foreground">
                                    Public URL: <span className="font-mono">{publicHref || "/learn/..."}</span>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="status">Status</Label>
                                    <select id="status" className={selectClassName()} value={status} onChange={(e) => setStatus(e.target.value as any)}>
                                        <option value="DRAFT">Draft</option>
                                        <option value="READY_FOR_REVIEW">Ready for review</option>
                                        <option value="PUBLISHED">Published</option>
                                        <option value="ARCHIVED">Archived</option>
                                    </select>
                                    {scheduledBadge ? <div className="text-xs text-muted-foreground">{scheduledBadge}</div> : null}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="publishAt">Publish at (optional)</Label>
                                    <Input
                                        id="publishAt"
                                        type="datetime-local"
                                        value={publishedAtLocal}
                                        onChange={(e) => setPublishedAtLocal(e.target.value)}
                                    />
                                    <div className="text-xs text-muted-foreground">
                                        If status is Published and the date is in the future, the article stays hidden until that time.
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="category">Category</Label>
                                    <select
                                        id="category"
                                        className={selectClassName()}
                                        value={category}
                                        onChange={(e) => setCategory((e.target.value || "") as any)}
                                    >
                                        <option value="">Select category…</option>
                                        {LEARN_CATEGORIES.map((c) => (
                                            <option key={c.slug} value={c.slug}>
                                                {c.label}
                                            </option>
                                        ))}
                                    </select>
                                    {category ? (
                                        <div className="text-xs text-muted-foreground">
                                            Displays as <span className="font-medium text-foreground">{categoryLabel(category)}</span> on /learn.
                                        </div>
                                    ) : null}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="author">Author (physician)</Label>
                                    <select
                                        id="author"
                                        className={selectClassName()}
                                        value={authorPhysicianId}
                                        onChange={(e) => setAuthorPhysicianId(e.target.value)}
                                    >
                                        <option value="">Present Health Team</option>
                                        {physicians.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}{p.credentials ? `, ${p.credentials}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedPhysician?.slug ? (
                                        <div className="text-xs text-muted-foreground">
                                            Links to <span className="font-mono">/our-physicians/{selectedPhysician.slug}</span>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="schemaType">Schema type</Label>
                                    <select id="schemaType" className={selectClassName()} value={schemaType} onChange={(e) => setSchemaType(e.target.value as any)}>
                                        <option value="Article">Article</option>
                                        <option value="HowTo">HowTo</option>
                                        <option value="FAQPage">FAQPage</option>
                                    </select>
                                    {faqWarning ? (
                                        <div className="text-xs text-amber-900">
                                            FAQPage schema is selected, but no FAQs are present. Add at least one FAQ below.
                                        </div>
                                    ) : null}
                                </div>
                                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
                                    <div>
                                        <div className="font-medium text-foreground">Refresh requested</div>
                                        <div className="text-xs text-muted-foreground">
                                            Flag this article for content freshness updates.
                                            {lastRefreshedAt ? <span> Last refreshed: {new Date(lastRefreshedAt).toLocaleDateString()}.</span> : null}
                                        </div>
                                    </div>
                                    <Switch checked={refreshRequested} onCheckedChange={setRefreshRequested} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>SEO</CardTitle>
                            <CardDescription>Meta tags shown in search results and previews.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="metaTitle">Meta title</Label>
                                <Input id="metaTitle" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={title || "Meta title"} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="metaDescription">Meta description</Label>
                                <Textarea id="metaDescription" value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={3} placeholder="Summary for search results and social previews." />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="excerpt">Excerpt</Label>
                                <Textarea id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} placeholder="Short summary shown on the /learn hub." />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Body</CardTitle>
                            <CardDescription>
                                Markdown supported. Use <span className="font-mono">##</span> and <span className="font-mono">###</span> headings to generate the table of contents.
                                For embeds, use:
                                <span className="font-mono">```embed{"\\n"}cost-comparison-calculator{"\\n"}```</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Tabs defaultValue="edit">
                                <TabsList>
                                    <TabsTrigger value="edit">Edit</TabsTrigger>
                                    <TabsTrigger value="preview">Preview</TabsTrigger>
                                </TabsList>
                                <TabsContent value="edit">
                                    <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={18} placeholder="Write your article here..." />
                                </TabsContent>
                                <TabsContent value="preview">
                                    <div className="prose dark:prose-invert max-w-none rounded-md border border-border bg-background p-4">
                                        {previewContent.trim() ? <Markdown content={previewContent} /> : <p className="text-muted-foreground">Nothing to preview yet.</p>}
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>FAQs</CardTitle>
                            <CardDescription>Add, edit, remove, and reorder FAQ items. Only complete Q/A pairs are saved.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="text-sm text-muted-foreground">{faqs.length} items</div>
                                <Button type="button" variant="outline" onClick={() => setFaqs((prev) => [{ id: newFaqId(), question: "", answer: "" }, ...prev])}>
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
                                                <Input value={f.question} onChange={(e) => updateFaq(f.id, { question: e.target.value })} placeholder="e.g., Can I use Present Health without insurance?" />
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
                </div>

                <div className="space-y-6">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Featured image</CardTitle>
                            <CardDescription>Upload or paste a local URL. Uploads are optimized for the web.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {featuredImage ? (
                                <div className="rounded-xl overflow-hidden border border-border bg-muted">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={featuredImage} alt="Featured" className="w-full h-auto object-cover" />
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
                                    No featured image.
                                </div>
                            )}

                            <div className="grid gap-2">
                                <Label htmlFor="featuredImage">Featured image URL</Label>
                                <Input id="featuredImage" value={featuredImage} onChange={(e) => setFeaturedImage(e.target.value)} placeholder="/uploads/articles/..." />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="featuredUpload">Upload (admin)</Label>
                                <Input
                                    id="featuredUpload"
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    disabled={!isEdit || statusMsg.type === "saving"}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) void uploadFeaturedImage(file);
                                    }}
                                />
                                {!isEdit ? (
                                    <div className="text-xs text-muted-foreground">Save the article first to enable uploads.</div>
                                ) : null}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Internal link suggester</CardTitle>
                            <CardDescription>Keyword-matched pages and related articles you can link to.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <Button type="button" variant="outline" size="sm" onClick={loadSuggestions} disabled={suggestionsStatus === "loading"}>
                                    {suggestionsStatus === "loading" ? "Loading..." : "Refresh suggestions"}
                                </Button>
                                {suggestionsStatus === "error" ? <span className="text-xs text-red-700">Failed to load</span> : null}
                            </div>
                            {suggestions.length ? (
                                <div className="space-y-2">
                                    {suggestions.map((s) => (
                                        <div key={`${s.type}:${s.url}`} className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="font-medium text-foreground truncate">{s.label}</div>
                                                <div className="text-xs text-muted-foreground font-mono truncate">{s.url}</div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const md = `[${s.label}](${s.url})`;
                                                    void navigator.clipboard?.writeText(md);
                                                }}
                                            >
                                                Copy
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-muted-foreground">No suggestions yet.</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Preview</CardTitle>
                            <CardDescription>Open the public page in a new tab.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div>
                                <span className="font-medium text-foreground">URL:</span>{" "}
                                <span className="font-mono">{publicHref || "—"}</span>
                            </div>
                            <Button asChild className="w-full" variant="outline" disabled={!isEdit}>
                                <Link href={publicHref || "/learn"} target="_blank">
                                    Open public page
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <ArticleSafetyPanel
                        articleId={isEdit ? initial?.id : undefined}
                        onInsertDisclaimer={(text) => {
                            setContent((prev) => {
                                const existing = prev.trim();
                                const disclaimerBlock = `\\n\\n> ${text.trim()}`;
                                if (!existing) return `> ${text.trim()}`;
                                return `${existing}${disclaimerBlock}`;
                            });
                        }}
                    />

                    <ArticleRefreshPanel articleId={isEdit ? initial?.id : undefined} />

                    <ArticleRepurposePanel articleId={isEdit ? initial?.id : undefined} />
                </div>
            </div>
        </div>
    );
}

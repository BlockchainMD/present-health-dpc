"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, Loader2, RefreshCw, WandSparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type RepurposeAsset = {
    id: string;
    articleId: string;
    articleUrl: string | null;
    linkedinPost: string | null;
    xThread: string | null;
    shortVideoScript: string | null;
    newsletterSubjectOptions: unknown;
    newsletterSnippet: string | null;
    linkedinPublishedAt: string | null;
    xPublishedAt: string | null;
    videoPublishedAt: string | null;
    newsletterPublishedAt: string | null;
    lastGeneratedAt: string | null;
    updatedAt: string;
};

type Completeness = {
    linkedin: boolean;
    x: boolean;
    video: boolean;
    newsletter: boolean;
};

function parseSubjectOptions(value: unknown) {
    if (!Array.isArray(value)) return ["", "", ""];
    const lines = value.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 3);
    while (lines.length < 3) lines.push("");
    return lines;
}

function formatDate(value: string | null | undefined) {
    if (!value) return "";
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return "";
    return d.toLocaleString();
}

export function ArticleRepurposePanel({ articleId }: { articleId?: string }) {
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState<"ALL" | "LINKEDIN" | "X" | "VIDEO" | "NEWSLETTER" | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [stale, setStale] = useState(false);
    const [articleUrl, setArticleUrl] = useState("");
    const [completeness, setCompleteness] = useState<Completeness>({
        linkedin: false,
        x: false,
        video: false,
        newsletter: false,
    });

    const [assetMeta, setAssetMeta] = useState<{ lastGeneratedAt: string | null; updatedAt: string | null }>({
        lastGeneratedAt: null,
        updatedAt: null,
    });

    const [linkedinPost, setLinkedinPost] = useState("");
    const [xThread, setXThread] = useState("");
    const [shortVideoScript, setShortVideoScript] = useState("");
    const [newsletterSubjects, setNewsletterSubjects] = useState<string[]>(["", "", ""]);
    const [newsletterSnippet, setNewsletterSnippet] = useState("");

    const [linkedinPublished, setLinkedinPublished] = useState(false);
    const [xPublished, setXPublished] = useState(false);
    const [videoPublished, setVideoPublished] = useState(false);
    const [newsletterPublished, setNewsletterPublished] = useState(false);

    const [publishedDates, setPublishedDates] = useState<{
        linkedin: string | null;
        x: string | null;
        video: string | null;
        newsletter: string | null;
    }>({
        linkedin: null,
        x: null,
        video: null,
        newsletter: null,
    });

    function hydrateFromResponse(data: any) {
        const asset = (data?.asset || null) as RepurposeAsset | null;

        setStale(Boolean(data?.stale));
        setArticleUrl(String(data?.articleUrl || asset?.articleUrl || ""));
        setCompleteness({
            linkedin: Boolean(data?.completeness?.linkedin),
            x: Boolean(data?.completeness?.x),
            video: Boolean(data?.completeness?.video),
            newsletter: Boolean(data?.completeness?.newsletter),
        });

        setLinkedinPost(asset?.linkedinPost || "");
        setXThread(asset?.xThread || "");
        setShortVideoScript(asset?.shortVideoScript || "");
        setNewsletterSubjects(parseSubjectOptions(asset?.newsletterSubjectOptions));
        setNewsletterSnippet(asset?.newsletterSnippet || "");

        const linkedinDate = asset?.linkedinPublishedAt || null;
        const xDate = asset?.xPublishedAt || null;
        const videoDate = asset?.videoPublishedAt || null;
        const newsletterDate = asset?.newsletterPublishedAt || null;

        setLinkedinPublished(Boolean(linkedinDate));
        setXPublished(Boolean(xDate));
        setVideoPublished(Boolean(videoDate));
        setNewsletterPublished(Boolean(newsletterDate));

        setPublishedDates({
            linkedin: linkedinDate,
            x: xDate,
            video: videoDate,
            newsletter: newsletterDate,
        });

        setAssetMeta({
            lastGeneratedAt: asset?.lastGeneratedAt || null,
            updatedAt: asset?.updatedAt || null,
        });
    }

    async function load() {
        if (!articleId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/articles/${articleId}/repurpose`, { cache: "no-store" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to load repurposed content");
            }
            hydrateFromResponse(data);
        } catch (e: any) {
            setError(e?.message || "Failed to load repurposed content");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [articleId]);

    useEffect(() => {
        const handler = () => {
            void load();
        };
        window.addEventListener("article-repurpose-refresh", handler);
        return () => window.removeEventListener("article-repurpose-refresh", handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [articleId]);

    async function generate(mode: "ALL" | "LINKEDIN" | "X" | "VIDEO" | "NEWSLETTER") {
        if (!articleId) return;
        setGenerating(mode);
        setError(null);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/articles/${articleId}/repurpose`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode, force: true }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to generate repurposed content");
            }

            hydrateFromResponse(data);
            setMessage(data?.skipped ? "Repurposed content is already up to date." : "Repurposed content generated.");
        } catch (e: any) {
            setError(e?.message || "Failed to generate repurposed content");
        } finally {
            setGenerating(null);
        }
    }

    async function saveEdits() {
        if (!articleId) return;
        setSaving(true);
        setError(null);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/articles/${articleId}/repurpose`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    linkedinPost,
                    xThread,
                    shortVideoScript,
                    newsletterSubjectOptions: newsletterSubjects,
                    newsletterSnippet,
                    linkedinPublished,
                    xPublished,
                    videoPublished,
                    newsletterPublished,
                }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to save repurposed content");
            }

            hydrateFromResponse(data);
            setMessage("Repurposed content saved.");
        } catch (e: any) {
            setError(e?.message || "Failed to save repurposed content");
        } finally {
            setSaving(false);
        }
    }

    async function copyText(text: string) {
        const normalized = String(text || "").trim();
        if (!normalized) return;
        try {
            await navigator.clipboard?.writeText(normalized);
            setMessage("Copied to clipboard.");
        } catch {
            setError("Clipboard copy failed in this browser context.");
        }
    }

    const completionCount = useMemo(() => {
        return [completeness.linkedin, completeness.x, completeness.video, completeness.newsletter].filter(Boolean).length;
    }, [completeness]);

    return (
        <Card className="border-border/60">
            <CardHeader>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <CardTitle className="text-lg">Repurpose</CardTitle>
                        <CardDescription>
                            Generate and edit platform-ready content for LinkedIn, X, short video, and newsletter.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || Boolean(generating)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                        <Button size="sm" onClick={() => void generate("ALL")} disabled={!articleId || Boolean(generating)}>
                            {generating === "ALL" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <WandSparkles className="h-4 w-4 mr-2" />}
                            Generate All
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {!articleId ? (
                    <div className="rounded-md border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                        Save this article first to generate repurposed content.
                    </div>
                ) : null}

                {error ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
                ) : null}
                {message ? (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>
                ) : null}

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-3 flex-wrap text-sm">
                                <div className="font-medium text-foreground">
                                    Completion: {completionCount}/4 formats ready
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <Badge variant={completeness.linkedin ? "default" : "outline"}>LinkedIn</Badge>
                                    <Badge variant={completeness.x ? "default" : "outline"}>X</Badge>
                                    <Badge variant={completeness.video ? "default" : "outline"}>Video</Badge>
                                    <Badge variant={completeness.newsletter ? "default" : "outline"}>Newsletter</Badge>
                                </div>
                            </div>

                            {articleUrl ? (
                                <div className="text-xs text-muted-foreground font-mono break-all">{articleUrl}</div>
                            ) : null}

                            <div className="text-xs text-muted-foreground">
                                Last generated: {formatDate(assetMeta.lastGeneratedAt) || "(not generated)"}
                                {assetMeta.updatedAt ? ` • Last saved: ${formatDate(assetMeta.updatedAt)}` : ""}
                            </div>
                        </div>

                        {stale ? (
                            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                Repurposed content may be stale because the article changed. Regenerate before publishing to social channels.
                            </div>
                        ) : null}

                        <Tabs defaultValue="linkedin">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
                                <TabsTrigger value="x">X Thread</TabsTrigger>
                                <TabsTrigger value="video">Video</TabsTrigger>
                                <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
                            </TabsList>

                            <TabsContent value="linkedin" className="space-y-3 mt-3">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <input
                                            id="linkedinPublished"
                                            type="checkbox"
                                            checked={linkedinPublished}
                                            onChange={(e) => setLinkedinPublished(e.target.checked)}
                                        />
                                        <Label htmlFor="linkedinPublished" className="text-xs">Published</Label>
                                        {publishedDates.linkedin ? <span>({formatDate(publishedDates.linkedin)})</span> : null}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => void generate("LINKEDIN")} disabled={Boolean(generating)}>
                                            {generating === "LINKEDIN" ? "Generating..." : "Regenerate"}
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => void copyText(linkedinPost)}>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy
                                        </Button>
                                    </div>
                                </div>
                                <Textarea
                                    value={linkedinPost}
                                    onChange={(e) => setLinkedinPost(e.target.value)}
                                    rows={12}
                                    placeholder="LinkedIn post output"
                                />
                            </TabsContent>

                            <TabsContent value="x" className="space-y-3 mt-3">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <input
                                            id="xPublished"
                                            type="checkbox"
                                            checked={xPublished}
                                            onChange={(e) => setXPublished(e.target.checked)}
                                        />
                                        <Label htmlFor="xPublished" className="text-xs">Published</Label>
                                        {publishedDates.x ? <span>({formatDate(publishedDates.x)})</span> : null}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => void generate("X")} disabled={Boolean(generating)}>
                                            {generating === "X" ? "Generating..." : "Regenerate"}
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => void copyText(xThread)}>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy
                                        </Button>
                                    </div>
                                </div>
                                <Textarea
                                    value={xThread}
                                    onChange={(e) => setXThread(e.target.value)}
                                    rows={10}
                                    placeholder="Thread with numbering (1/4, 2/4...)"
                                />
                            </TabsContent>

                            <TabsContent value="video" className="space-y-3 mt-3">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <input
                                            id="videoPublished"
                                            type="checkbox"
                                            checked={videoPublished}
                                            onChange={(e) => setVideoPublished(e.target.checked)}
                                        />
                                        <Label htmlFor="videoPublished" className="text-xs">Published</Label>
                                        {publishedDates.video ? <span>({formatDate(publishedDates.video)})</span> : null}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => void generate("VIDEO")} disabled={Boolean(generating)}>
                                            {generating === "VIDEO" ? "Generating..." : "Regenerate"}
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => void copyText(shortVideoScript)}>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy
                                        </Button>
                                    </div>
                                </div>
                                <Textarea
                                    value={shortVideoScript}
                                    onChange={(e) => setShortVideoScript(e.target.value)}
                                    rows={10}
                                    placeholder="00:00 - Hook ..."
                                />
                            </TabsContent>

                            <TabsContent value="newsletter" className="space-y-3 mt-3">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <input
                                            id="newsletterPublished"
                                            type="checkbox"
                                            checked={newsletterPublished}
                                            onChange={(e) => setNewsletterPublished(e.target.checked)}
                                        />
                                        <Label htmlFor="newsletterPublished" className="text-xs">Published</Label>
                                        {publishedDates.newsletter ? <span>({formatDate(publishedDates.newsletter)})</span> : null}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => void generate("NEWSLETTER")} disabled={Boolean(generating)}>
                                            {generating === "NEWSLETTER" ? "Generating..." : "Regenerate"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                void copyText(
                                                    [
                                                        `Subject 1: ${newsletterSubjects[0] || ""}`,
                                                        `Subject 2: ${newsletterSubjects[1] || ""}`,
                                                        `Subject 3: ${newsletterSubjects[2] || ""}`,
                                                        "",
                                                        newsletterSnippet,
                                                    ]
                                                        .join("\n")
                                                        .trim()
                                                )
                                            }
                                        >
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label>Subject options</Label>
                                    {newsletterSubjects.map((line, index) => (
                                        <Input
                                            key={`subject-${index + 1}`}
                                            value={line}
                                            onChange={(e) =>
                                                setNewsletterSubjects((prev) => {
                                                    const next = [...prev];
                                                    next[index] = e.target.value;
                                                    return next;
                                                })
                                            }
                                            placeholder={`Subject option ${index + 1}`}
                                        />
                                    ))}
                                </div>

                                <div className="grid gap-2">
                                    <Label>Newsletter snippet</Label>
                                    <Textarea
                                        value={newsletterSnippet}
                                        onChange={(e) => setNewsletterSnippet(e.target.value)}
                                        rows={8}
                                        placeholder="100-150 word newsletter summary"
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>

                        <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" />
                                Save edits and publishing checkboxes to update distribution tracking.
                            </div>
                            <Button onClick={() => void saveEdits()} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                Save Repurpose Content
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

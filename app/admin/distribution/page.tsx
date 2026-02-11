import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatDate(value: Date | null | undefined) {
    if (!value) return "";
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return "";
    return d.toLocaleDateString();
}

function hasNewsletterReady(value: unknown, snippet: string | null) {
    const subjects = Array.isArray(value) ? value.filter((x) => String(x || "").trim()).length : 0;
    return subjects >= 3 && Boolean(snippet?.trim());
}

function channelBadge(ready: boolean, publishedAt: Date | null | undefined) {
    if (publishedAt) return <Badge className="bg-emerald-600">Published {formatDate(publishedAt)}</Badge>;
    if (ready) return <Badge variant="outline">Ready</Badge>;
    return <Badge variant="secondary">Missing</Badge>;
}

export default async function ContentDistributionTrackerPage() {
    const articles = await prisma.article.findMany({
        where: {
            OR: [{ status: "PUBLISHED" }, { repurposeAsset: { isNot: null } }],
        },
        orderBy: [{ updatedAt: "desc" }],
        take: 250,
        select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            publishedAt: true,
            updatedAt: true,
            repurposeAsset: {
                select: {
                    linkedinPost: true,
                    xThread: true,
                    shortVideoScript: true,
                    newsletterSubjectOptions: true,
                    newsletterSnippet: true,
                    linkedinPublishedAt: true,
                    xPublishedAt: true,
                    videoPublishedAt: true,
                    newsletterPublishedAt: true,
                    lastGeneratedAt: true,
                },
            },
        },
    });

    const totals = {
        linkedin: 0,
        x: 0,
        video: 0,
        newsletter: 0,
    };

    for (const article of articles) {
        const asset = article.repurposeAsset;
        if (!asset) continue;
        if (asset.linkedinPublishedAt) totals.linkedin += 1;
        if (asset.xPublishedAt) totals.x += 1;
        if (asset.videoPublishedAt) totals.video += 1;
        if (asset.newsletterPublishedAt) totals.newsletter += 1;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Content Distribution Tracker</h1>
                <p className="text-sm text-muted-foreground">
                    Track repurposed content and publication status across LinkedIn, X, short video, and newsletter.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">LinkedIn Published</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">{totals.linkedin}</CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">X Published</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">{totals.x}</CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Video Published</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">{totals.video}</CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Newsletter Published</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">{totals.newsletter}</CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Articles x Platforms</CardTitle>
                </CardHeader>
                <CardContent>
                    {articles.length ? (
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/40 text-left">
                                    <tr>
                                        <th className="px-3 py-2">Article</th>
                                        <th className="px-3 py-2">Status</th>
                                        <th className="px-3 py-2">LinkedIn</th>
                                        <th className="px-3 py-2">X</th>
                                        <th className="px-3 py-2">Video</th>
                                        <th className="px-3 py-2">Newsletter</th>
                                        <th className="px-3 py-2">Last Generated</th>
                                        <th className="px-3 py-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {articles.map((article) => {
                                        const asset = article.repurposeAsset;
                                        const linkedinReady = Boolean(asset?.linkedinPost?.trim());
                                        const xReady = Boolean(asset?.xThread?.trim());
                                        const videoReady = Boolean(asset?.shortVideoScript?.trim());
                                        const newsletterReady = hasNewsletterReady(asset?.newsletterSubjectOptions, asset?.newsletterSnippet || null);
                                        const stale = Boolean(
                                            asset?.lastGeneratedAt && new Date(article.updatedAt).getTime() > new Date(asset.lastGeneratedAt).getTime()
                                        );

                                        return (
                                            <tr key={article.id} className="border-t">
                                                <td className="px-3 py-2 align-top">
                                                    <div className="font-medium text-foreground">{article.title || "(Untitled)"}</div>
                                                    <div className="text-xs text-muted-foreground font-mono">/learn/{article.slug || article.id}</div>
                                                </td>
                                                <td className="px-3 py-2 align-top">
                                                    <div className="space-y-1">
                                                        {article.status === "PUBLISHED" ? (
                                                            <Badge className="bg-emerald-600">Published</Badge>
                                                        ) : (
                                                            <Badge variant="outline">{article.status}</Badge>
                                                        )}
                                                        {stale ? <Badge variant="secondary">Stale</Badge> : null}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 align-top">{channelBadge(linkedinReady, asset?.linkedinPublishedAt)}</td>
                                                <td className="px-3 py-2 align-top">{channelBadge(xReady, asset?.xPublishedAt)}</td>
                                                <td className="px-3 py-2 align-top">{channelBadge(videoReady, asset?.videoPublishedAt)}</td>
                                                <td className="px-3 py-2 align-top">{channelBadge(newsletterReady, asset?.newsletterPublishedAt)}</td>
                                                <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                                                    {formatDate(asset?.lastGeneratedAt || null) || "(never)"}
                                                </td>
                                                <td className="px-3 py-2 align-top text-right">
                                                    <Button asChild variant="outline" size="sm">
                                                        <Link href={`/admin/learn/${article.id}`}>Open</Link>
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                            No published or repurposed articles yet.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

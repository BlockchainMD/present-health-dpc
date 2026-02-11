import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { categoryLabel } from "@/lib/learn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getArticles() {
    try {
        return await prisma.article.findMany({
            orderBy: [{ createdAt: "desc" }],
            take: 200,
            select: {
                id: true,
                title: true,
                slug: true,
                status: true,
                category: true,
                publishedAt: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    } catch (error) {
        console.error("[admin/learn] Failed to fetch articles", error);
        return [];
    }
}

function statusBadge(status: string) {
    if (status === "PUBLISHED") return <Badge className="bg-emerald-600">Published</Badge>;
    if (status === "READY_FOR_REVIEW") return <Badge className="bg-amber-600 text-black">Ready for review</Badge>;
    if (status === "ARCHIVED") return <Badge variant="outline">Archived</Badge>;
    if (status === "DISCARDED") return <Badge variant="outline">Discarded</Badge>;
    return <Badge variant="secondary">Draft</Badge>;
}

export default async function AdminLearnArticlesPage() {
    const articles = await getArticles();
    const now = new Date();

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Learn Articles</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage content for <span className="font-mono">/learn</span>. Use status + publish date for scheduled publishing.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="outline">
                        <Link href="/admin/content-refresh">Refresh manager</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/admin/distribution">Distribution tracker</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/admin/content-briefs">Generate brief</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/admin/learn/new">New article</Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-4">
                {articles.map((a) => {
                    const isScheduled = a.status === "PUBLISHED" && a.publishedAt && a.publishedAt > now;
                    const href = `/learn/${a.slug || a.id}`;
                    const category = categoryLabel(a.category) || (a.category ? a.category : null);
                    return (
                        <Card key={a.id} className="border-border/60">
                            <CardHeader className="flex-row items-start justify-between gap-4">
                                <div className="space-y-2 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {statusBadge(a.status)}
                                        {isScheduled ? <Badge variant="outline">Scheduled</Badge> : null}
                                        {category ? <Badge variant="outline">{category}</Badge> : null}
                                    </div>
                                    <CardTitle className="text-lg leading-tight truncate">{a.title || "(Untitled)"}</CardTitle>
                                </div>
                                <div className="flex gap-2">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={href} target="_blank">
                                            View
                                        </Link>
                                    </Button>
                                    <Button asChild size="sm">
                                        <Link href={`/admin/learn/${a.id}`}>Edit</Link>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-1">
                                <div>
                                    <span className="font-medium text-foreground">Slug:</span>{" "}
                                    <span className="font-mono">{a.slug || "(none)"}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-foreground">Publish date:</span>{" "}
                                    {a.publishedAt ? format(new Date(a.publishedAt), "MMM d, yyyy p") : "(not set)"}
                                </div>
                                <div>
                                    <span className="font-medium text-foreground">Updated:</span>{" "}
                                    {format(new Date(a.updatedAt), "MMM d, yyyy p")}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {articles.length === 0 ? (
                <div className="rounded-2xl border border-border bg-muted/20 p-8 text-muted-foreground">
                    No articles yet. Create one to publish content under <span className="font-mono">/learn</span>.
                </div>
            ) : null}
        </div>
    );
}

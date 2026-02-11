import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getStates() {
    try {
        return await prisma.state.findMany({
            orderBy: [{ isActive: "desc" }, { name: "asc" }],
        });
    } catch (error) {
        console.error("[admin/states] Failed to fetch states", error);
        return [];
    }
}

export default async function AdminStatesPage() {
    const states = await getStates();

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">States</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage state pages shown on <span className="font-mono">/states</span>.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/admin/states/new">New state</Link>
                </Button>
            </div>

            <div className="grid gap-4">
                {states.map((s) => (
                    <Card key={s.id} className="border-border/60">
                        <CardHeader className="flex-row items-start justify-between gap-4">
                            <div className="space-y-2">
                                <CardTitle className="text-lg">{s.name}</CardTitle>
                                <div className="flex flex-wrap gap-2">
                                    {s.isActive ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Hidden</Badge>}
                                    {s.metaTitle ? <Badge variant="outline">Custom title</Badge> : null}
                                    {s.metaDescription ? <Badge variant="outline">Custom description</Badge> : null}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/states/${s.slug}`} target="_blank">
                                        View
                                    </Link>
                                </Button>
                                <Button asChild size="sm">
                                    <Link href={`/admin/states/${s.id}`}>Edit</Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            <div>
                                <span className="font-medium text-foreground">Slug:</span>{" "}
                                <span className="font-mono">{s.slug}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {states.length === 0 ? (
                <div className="rounded-2xl border border-border bg-muted/20 p-8 text-muted-foreground">
                    No states yet. Create one to populate <span className="font-mono">/states</span>.
                </div>
            ) : null}
        </div>
    );
}


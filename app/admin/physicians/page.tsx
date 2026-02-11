import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getPhysicians() {
    try {
        return await prisma.physician.findMany({
            orderBy: [{ isActive: "desc" }, { name: "asc" }],
        });
    } catch (error) {
        console.error("[admin/physicians] Failed to fetch physicians", error);
        return [];
    }
}

export default async function AdminPhysiciansPage() {
    const physicians = await getPhysicians();

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Physicians</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage clinician profiles shown on <span className="font-mono">/our-physicians</span> and the Trust Hub.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/admin/physicians/new">New physician</Link>
                </Button>
            </div>

            <div className="grid gap-4">
                {physicians.map((p) => (
                    <Card key={p.id} className="border-border/60">
                        <CardHeader className="flex-row items-start justify-between gap-4">
                            <div className="space-y-2">
                                <CardTitle className="text-lg">{p.name}</CardTitle>
                                <div className="flex flex-wrap gap-2">
                                    {p.isActive ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Hidden</Badge>}
                                    {p.credentials ? <Badge variant="outline">{p.credentials}</Badge> : null}
                                    {p.boardCertification ? <Badge variant="outline">{p.boardCertification}</Badge> : null}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/our-physicians/${p.slug}`} target="_blank">
                                        View
                                    </Link>
                                </Button>
                                <Button asChild size="sm">
                                    <Link href={`/admin/physicians/${p.id}`}>Edit</Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            <div>
                                <span className="font-medium text-foreground">Slug:</span>{" "}
                                <span className="font-mono">{p.slug}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {physicians.length === 0 ? (
                <div className="rounded-2xl border border-border bg-muted/20 p-8 text-muted-foreground">
                    No physicians yet. Create one to populate <span className="font-mono">/our-physicians</span>.
                </div>
            ) : null}
        </div>
    );
}


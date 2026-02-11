import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getTestimonials() {
    try {
        return await prisma.employerTestimonial.findMany({
            orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
        });
    } catch (error) {
        console.error("[admin/employers/testimonials] Failed to fetch testimonials", error);
        return [];
    }
}

export default async function AdminEmployerTestimonialsPage() {
    const testimonials = await getTestimonials();

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Employer testimonials</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage testimonials shown on <span className="font-mono">/for-employers</span>.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/admin/employers/testimonials/new">New testimonial</Link>
                </Button>
            </div>

            <div className="grid gap-4">
                {testimonials.map((t) => (
                    <Card key={t.id} className="border-border/60">
                        <CardHeader className="flex-row items-start justify-between gap-4">
                            <div className="space-y-2 min-w-0">
                                <CardTitle className="text-lg truncate">{t.companyName}</CardTitle>
                                <div className="flex flex-wrap gap-2">
                                    {t.isActive ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Hidden</Badge>}
                                    <Badge variant="outline">Order: {t.sortOrder}</Badge>
                                    {t.logoUrl ? <Badge variant="outline">Logo</Badge> : null}
                                    {t.personName ? <Badge variant="outline">Attribution</Badge> : null}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button asChild variant="outline" size="sm">
                                    <Link href="/for-employers" target="_blank">
                                        View
                                    </Link>
                                </Button>
                                <Button asChild size="sm">
                                    <Link href={`/admin/employers/testimonials/${t.id}`}>Edit</Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            <div className="rounded-lg border border-border bg-muted/10 p-3">
                                {t.quote.length > 220 ? `${t.quote.slice(0, 220)}...` : t.quote}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {testimonials.length === 0 ? (
                <div className="rounded-2xl border border-border bg-muted/20 p-8 text-muted-foreground">
                    No testimonials yet.
                </div>
            ) : null}
        </div>
    );
}


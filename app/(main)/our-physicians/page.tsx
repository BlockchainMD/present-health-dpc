import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SchemaBlocks } from "@/components/seo/SchemaBlocks";
import { getActivePhysicians } from "@/lib/public-site";
import { buildOurPhysiciansHubSchemas } from "@/lib/schema";

export const metadata: Metadata = {
    title: "Our Physicians | Present Health",
    description: "Meet the Present Health physicians providing telehealth-first Direct Primary Care.",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function OurPhysiciansPage() {
    const physicians = await getActivePhysicians();
    const schemaBlocks = buildOurPhysiciansHubSchemas();

    return (
        <div className="container px-4 md:px-6 mx-auto py-24">
            <SchemaBlocks blocks={schemaBlocks} idPrefix="our-physicians" />

            <header className="max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Our Physicians</h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    Telehealth-first primary care, delivered by licensed physicians. This directory is built to scale as our team grows.
                </p>
            </header>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {physicians.map((p) => (
                    <Card key={p.id} className="overflow-hidden border-border/60 hover:shadow-md transition-shadow">
                        <div className="relative h-56 bg-muted">
                            {(() => {
                                const photoSrc = p.photoUrl || "/doctor-portrait.jpg";
                                const isLocal = photoSrc.startsWith("/");
                                return isLocal ? (
                                    <Image src={photoSrc} alt={p.name} fill className="object-cover" />
                                ) : (
                                    // Avoid Next.js remote image domain config for now.
                                    <img src={photoSrc} alt={p.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                                );
                            })()}
                        </div>
                        <CardHeader className="space-y-2">
                            <CardTitle className="leading-tight">
                                <Link href={`/our-physicians/${p.slug}`} className="hover:text-primary transition-colors">
                                    {p.name}
                                </Link>
                            </CardTitle>
                            <div className="flex flex-wrap gap-2">
                                {p.credentials ? <Badge variant="secondary">{p.credentials}</Badge> : null}
                                {p.boardCertification ? <Badge variant="outline">{p.boardCertification}</Badge> : null}
                                {typeof p.yearsExperience === "number" ? (
                                    <Badge variant="outline">{p.yearsExperience}+ yrs</Badge>
                                ) : null}
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-3">
                            <div>
                                <span className="font-medium text-foreground">Licensed in:</span>{" "}
                                {p.statesLicensed?.length ? `${p.statesLicensed.length} state(s)` : "Select states"}
                            </div>
                            <Link
                                href={`/our-physicians/${p.slug}`}
                                className="inline-flex text-sm font-medium text-primary hover:underline"
                            >
                                View profile
                            </Link>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {physicians.length === 0 && (
                <div className="mt-12 rounded-2xl border border-border bg-muted/20 p-8 text-muted-foreground">
                    No physicians are listed yet.
                </div>
            )}
        </div>
    );
}

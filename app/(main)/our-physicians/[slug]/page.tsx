import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchemaBlocks } from "@/components/seo/SchemaBlocks";
import { getPhysicianBySlug } from "@/lib/public-site";
import { Markdown } from "@/components/markdown";
import { normalizeMarkdownForRender } from "@/lib/markdown-utils";
import { markdownToPlainText } from "@/lib/markdown-plain";
import { ABFM_VERIFICATION_URL, npiRegistryProviderUrl } from "@/lib/verification-links";
import { stateDisplayName, stateSlug } from "@/lib/us-states";
import { buildPhysicianSchemas } from "@/lib/schema";

export const runtime = "nodejs";

type SlugParams = { slug: string } | Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: SlugParams }): Promise<Metadata> {
    const { slug } = await params;
    const physician = await getPhysicianBySlug(slug);
    if (!physician || !physician.isActive) return {};

    const title = physician.credentials ? `${physician.name}, ${physician.credentials} | Present Health` : `${physician.name} | Present Health`;

    return {
        title,
        description: physician.bio
            ? markdownToPlainText(physician.bio).slice(0, 160)
            : `View ${physician.name}'s physician profile at Present Health.`,
    };
}

export default async function PhysicianProfilePage({ params }: { params: SlugParams }) {
    const { slug } = await params;
    const physician = await getPhysicianBySlug(slug);

    if (!physician || !physician.isActive) {
        notFound();
    }

    const bioMarkdown = physician.bio ? normalizeMarkdownForRender(physician.bio) : "";
    const schemaBlocks = buildPhysicianSchemas({
        name: physician.name,
        slug: physician.slug,
        bio: bioMarkdown || physician.bio || "",
        photoUrl: physician.photoUrl,
        npiNumber: physician.npiNumber,
        statesLicensed: physician.statesLicensed,
    });

    return (
        <div className="container px-4 md:px-6 mx-auto py-24 max-w-5xl">
            <SchemaBlocks blocks={schemaBlocks} idPrefix={`physician-${physician.slug}`} />

            <div className="grid gap-8 lg:grid-cols-[320px_1fr] items-start">
                <Card className="overflow-hidden border-border/60">
                    <div className="relative aspect-[3/4] bg-muted">
                        {(() => {
                            const photoSrc = physician.photoUrl || "/doctor-portrait.jpg";
                            const isLocal = photoSrc.startsWith("/");
                            return isLocal ? (
                                <Image src={photoSrc} alt={physician.name} fill className="object-cover" priority />
                            ) : (
                                // Avoid Next.js remote image domain config for now.
                                <img src={photoSrc} alt={physician.name} className="absolute inset-0 h-full w-full object-cover" />
                            );
                        })()}
                    </div>
                </Card>

                <div className="space-y-6">
                    <header className="space-y-3">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{physician.name}</h1>
                        <div className="flex flex-wrap gap-2">
                            {physician.credentials ? <Badge variant="secondary">{physician.credentials}</Badge> : null}
                            {physician.boardCertification ? <Badge variant="outline">{physician.boardCertification}</Badge> : null}
                            {typeof physician.yearsExperience === "number" ? (
                                <Badge variant="outline">{physician.yearsExperience}+ years experience</Badge>
                            ) : null}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Button asChild>
                                <Link href="/join">Book a consultation</Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/pricing">See pricing</Link>
                            </Button>
                        </div>
                    </header>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Card className="border-border/60">
                            <CardHeader>
                                <CardTitle className="text-base">Licensure</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-2">
                                {physician.statesLicensed?.length ? (
                                    <div className="flex flex-wrap gap-2">
                                        {physician.statesLicensed.map((s) => (
                                            <Link
                                                key={s}
                                                href={`/states/${stateSlug(s)}`}
                                                className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-foreground hover:bg-muted transition-colors"
                                            >
                                                {stateDisplayName(s)}
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div>State licensure list coming soon.</div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-border/60">
                            <CardHeader>
                                <CardTitle className="text-base">Identifiers</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-2">
                                <div>
                                    <span className="font-medium text-foreground">NPI:</span>{" "}
                                    {physician.npiNumber ? (
                                        <a
                                            href={npiRegistryProviderUrl(physician.npiNumber)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-primary hover:underline"
                                        >
                                            {physician.npiNumber}
                                        </a>
                                    ) : (
                                        "Coming soon"
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-base">Board certification</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-2">
                            <div>
                                {physician.boardCertification || "Board certification details coming soon."}
                            </div>
                            <div>
                                <a
                                    href={ABFM_VERIFICATION_URL}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    Verify via ABFM
                                </a>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-base">About</CardTitle>
                        </CardHeader>
                        <CardContent className="prose dark:prose-invert max-w-none">
                            {bioMarkdown ? <Markdown content={bioMarkdown} /> : <p>Bio coming soon.</p>}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

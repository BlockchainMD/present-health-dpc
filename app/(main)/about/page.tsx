import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTrustHubAboutBlocks } from "@/lib/trust-hub";
import { ABFM_VERIFICATION_URL, fsmbStateMedicalBoardUrl, npiRegistryProviderUrl } from "@/lib/verification-links";
import { stateDisplayName, stateSlug } from "@/lib/us-states";
import { SchemaBlocks } from "@/components/seo/SchemaBlocks";
import { Markdown } from "@/components/markdown";
import { normalizeMarkdownForRender } from "@/lib/markdown-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAboutSchemas } from "@/lib/schema";

export const metadata: Metadata = {
    title: "About & Trust Hub | Present Health",
    description:
        "Trust hub for Present Health: physician credentials, verification links, and clear guidance on what Direct Primary Care covers.",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getActivePhysicians() {
    try {
        return await prisma.physician.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
        });
    } catch (error) {
        console.error("[about] Failed to fetch physicians", error);
        return [];
    }
}

export default async function AboutTrustHubPage() {
    const [blocks, physicians] = await Promise.all([getTrustHubAboutBlocks(), getActivePhysicians()]);
    const schemaBlocks = buildAboutSchemas(blocks.practiceOverviewMarkdown);

    return (
        <div className="min-h-screen bg-background">
            <div className="container px-4 md:px-6 mx-auto pt-24 pb-12 max-w-6xl">
                <SchemaBlocks blocks={schemaBlocks} idPrefix="about" />

                <header className="max-w-3xl">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Trust Hub</h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Credentials, verification links, and clear expectations about telehealth-first Direct Primary Care.
                    </p>
                </header>

                <section className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Practice overview</CardTitle>
                        </CardHeader>
                        <CardContent className="prose prose-lg dark:prose-invert max-w-none">
                            <Markdown content={normalizeMarkdownForRender(blocks.practiceOverviewMarkdown)} />
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Verification links</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-3">
                            <div>
                                <div className="font-medium text-foreground">NPI Registry</div>
                                <a
                                    href="https://npiregistry.cms.hhs.gov/"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    npiregistry.cms.hhs.gov
                                </a>
                            </div>
                            <div>
                                <div className="font-medium text-foreground">ABFM board certification</div>
                                <a
                                    href={ABFM_VERIFICATION_URL}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    ABFM verification tool
                                </a>
                            </div>
                            <div>
                                <div className="font-medium text-foreground">State medical boards</div>
                                <a
                                    href="https://www.fsmb.org/contact-a-state-medical-board/"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    FSMB state medical board directory
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section className="mt-12">
                    <div className="flex items-end justify-between gap-4 flex-wrap">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">Our credentials</h2>
                            <p className="mt-2 text-muted-foreground">
                                Verified physician identity and licensure links. This list updates automatically based on active clinicians.
                            </p>
                        </div>
                        <Button asChild variant="outline">
                            <Link href="/our-physicians">View physician directory</Link>
                        </Button>
                    </div>

                    <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {physicians.map((p) => {
                            const states = (p.statesLicensed || []).filter(Boolean);
                            return (
                                <Card key={p.id} className="border-border/60">
                                    <CardHeader className="space-y-2">
                                        <CardTitle className="text-xl leading-tight">
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
                                    <CardContent className="text-sm text-muted-foreground space-y-4">
                                        <div className="grid gap-2">
                                            <div className="font-medium text-foreground">Verify</div>
                                            <div className="flex flex-wrap gap-3">
                                                <a
                                                    href={npiRegistryProviderUrl(p.npiNumber)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-primary hover:underline"
                                                >
                                                    NPI registry
                                                </a>
                                                <a
                                                    href={ABFM_VERIFICATION_URL}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-primary hover:underline"
                                                >
                                                    ABFM
                                                </a>
                                            </div>
                                        </div>

                                        <div className="grid gap-2">
                                            <div className="font-medium text-foreground">State license verification</div>
                                            {states.length ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {states.map((s) => (
                                                        <a
                                                            key={s}
                                                            href={fsmbStateMedicalBoardUrl(s)}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-foreground hover:bg-muted transition-colors"
                                                        >
                                                            {stateDisplayName(s)}
                                                        </a>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div>State licensure links coming soon.</div>
                                            )}
                                        </div>

                                        {p.npiNumber ? (
                                            <div>
                                                <span className="font-medium text-foreground">NPI:</span>{" "}
                                                <a
                                                    href={npiRegistryProviderUrl(p.npiNumber)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-primary hover:underline"
                                                >
                                                    {p.npiNumber}
                                                </a>
                                            </div>
                                        ) : null}

                                        {states.length ? (
                                            <div className="text-xs text-muted-foreground">
                                                Licensed in{" "}
                                                {states.map((s, idx) => (
                                                    <span key={s}>
                                                        <Link href={`/states/${stateSlug(s)}`} className="text-primary hover:underline">
                                                            {stateDisplayName(s)}
                                                        </Link>
                                                        {idx < states.length - 1 ? ", " : ""}
                                                    </span>
                                                ))}
                                                .
                                            </div>
                                        ) : null}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {physicians.length === 0 && (
                        <div className="mt-6 rounded-2xl border border-border bg-muted/20 p-8 text-muted-foreground">
                            No active physicians are currently listed.
                        </div>
                    )}
                </section>

                <section className="mt-16 grid gap-6 lg:grid-cols-2 items-start">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>What DPC covers</CardTitle>
                        </CardHeader>
                        <CardContent className="prose dark:prose-invert max-w-none">
                            <Markdown content={normalizeMarkdownForRender(blocks.dpcCoversMarkdown)} />
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>What DPC does not cover</CardTitle>
                        </CardHeader>
                        <CardContent className="prose dark:prose-invert max-w-none">
                            <Markdown content={normalizeMarkdownForRender(blocks.dpcDoesntCoverMarkdown)} />
                        </CardContent>
                    </Card>
                </section>

                <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>HIPAA and privacy</CardTitle>
                        </CardHeader>
                        <CardContent className="prose dark:prose-invert max-w-none">
                            <Markdown content={normalizeMarkdownForRender(blocks.hipaaPrivacyMarkdown)} />
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>AAFP definition of DPC</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-3">
                            <blockquote className="border-l-2 border-primary pl-4 italic text-foreground">
                                “patients/consumers pay their physician or practice directly in the form of periodic payments for a defined set of primary care services.”
                            </blockquote>
                            <div>
                                <a
                                    href="https://www.aafp.org/about/policies/all/direct-primary-care.html"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    Source: American Academy of Family Physicians (AAFP)
                                </a>
                            </div>
                            <div className="text-xs">
                                We reference AAFP’s description of DPC to help set expectations. Present Health is a DPC clinic, not insurance.
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </div>
    );
}

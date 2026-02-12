import type { Metadata } from "next";
import Link from "next/link";
import { SchemaBlocks } from "@/components/seo/SchemaBlocks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAboutSchemas } from "@/lib/schema";

export const metadata: Metadata = {
    title: "About | Present Health",
    description:
        "Present Health is messaging-first primary care for adults 18 and older. $49/month with no per-visit fees.",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AboutTrustHubPage() {
    const practiceOverview =
        "Present Health is full-service primary care, delivered messaging-first. We handle sick visits, chronic conditions, prescriptions, lab work, wellness planning, and care coordination. Most care happens through secure messaging. When a video visit is needed, it's included. When in-person care is needed, we help coordinate it. About 80-90% of primary care doesn't require a physical exam. We handle that and make sure the rest doesn't fall through the cracks.";
    const whyDpc =
        "Direct Primary Care removes the insurance middleman. Instead of billing insurance and dealing with copays, prior authorizations, and claim denials, you pay a simple monthly fee directly. Your clinical team spends time on care - not paperwork. No surprise bills, no out-of-network issues.";
    const schemaBlocks = buildAboutSchemas(practiceOverview);

    return (
        <div className="min-h-screen bg-background">
            <div className="container px-4 md:px-6 mx-auto pt-24 pb-12 max-w-5xl">
                <SchemaBlocks blocks={schemaBlocks} idPrefix="about" />

                <header className="max-w-3xl">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">About Present Health</h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Primary care that starts with a message, with clear pricing and no insurance billing.
                    </p>
                </header>

                <section className="mt-12 grid gap-6">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Our Model</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-muted-foreground">
                            <p>{practiceOverview}</p>
                            <p className="font-medium text-foreground">Adults 18 and older.</p>
                            <p className="text-sm">
                                Care delivered by licensed clinicians and overseen by a board-certified physician.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Why DPC</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-muted-foreground">
                            <p>{whyDpc}</p>
                            <p className="text-sm">
                                Care delivered by licensed clinicians and overseen by a board-certified physician.
                            </p>
                        </CardContent>
                    </Card>
                </section>

                <section className="mt-12 rounded-2xl border border-border bg-muted/20 px-6 py-8 md:px-8 md:py-10">
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Start Membership</h2>
                    <p className="mt-3 text-muted-foreground">
                        Full-service primary care by message, phone, or video for adults 18 and older.
                    </p>
                    <div className="mt-6">
                        <Button asChild size="lg">
                            <Link href="/join">Start Membership — $49/mo</Link>
                        </Button>
                    </div>
                </section>
            </div>
        </div>
    );
}

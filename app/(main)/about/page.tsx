import type { Metadata } from "next";
import Link from "next/link";
import { SchemaBlocks } from "@/components/seo/SchemaBlocks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAboutSchemas } from "@/lib/schema";

export const metadata: Metadata = {
    title: "About | Present Health",
    description:
        "Present Health is virtual primary care that works with your insurance. We accept most major commercial plans.",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AboutPage() {
    const missionStatement =
        "Present Health makes quality primary care accessible and convenient. We offer video visits with board-certified physicians who manage your chronic conditions and provide full-spectrum primary care. We accept most major insurance plans, and for those without insurance, visits start at $29. Our focus is on continuity of care, evidence-based management, and treating patients as whole people — not just transactions.";

    const whyWeBuilt =
        "Healthcare access is broken. Too many people with chronic conditions fall through the cracks — appointments are months away, co-pays are unpredictable, and continuity of care is rare. Virtual primary care can solve this. A board-certified physician can manage blood pressure, diabetes, thyroid, cholesterol, and more through video visits. No office overhead, no unnecessary in-person visits, lower costs, and better outcomes for chronic disease management. We built Present Health to prove that model works while still accepting insurance.";

    const schemaBlocks = buildAboutSchemas(missionStatement);

    return (
        <div className="min-h-screen bg-background">
            <div className="container px-4 md:px-6 mx-auto pt-24 pb-12 max-w-5xl">
                <SchemaBlocks blocks={schemaBlocks} idPrefix="about" />

                <header className="max-w-3xl mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">About Present Health</h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Virtual primary care that works with your insurance.
                    </p>
                </header>

                <section className="mt-12 grid gap-6 mb-12">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Our Mission</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-muted-foreground">
                            <p>{missionStatement}</p>
                            <p className="text-sm">
                                Care delivered by licensed clinicians and overseen by board-certified physicians. We serve adults 18 and older.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Why We Built This</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-muted-foreground">
                            <p>{whyWeBuilt}</p>
                            <p className="text-sm">
                                We accept most major commercial insurance plans. No insurance? Visits start at $29. Either way, you get access to board-certified physician care.
                            </p>
                        </CardContent>
                    </Card>
                </section>

                <section className="rounded-2xl border border-border bg-muted/20 px-6 py-8 md:px-8 md:py-10">
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Ready to get started?</h2>
                    <p className="mt-3 text-muted-foreground">
                        Book a video visit this week with a board-certified physician.
                    </p>
                    <div className="mt-6">
                        <Button asChild size="lg" className="h-12 px-8 text-base">
                            <Link href="/book">Book a Visit</Link>
                        </Button>
                    </div>
                </section>
            </div>
        </div>
    );
}

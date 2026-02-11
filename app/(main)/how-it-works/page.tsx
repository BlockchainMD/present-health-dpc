import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
    title: "How It Works | Present Health",
    description: "How Present Health works: the Direct Primary Care (DPC) membership model plus a modern telehealth-first workflow.",
};

export default function HowItWorksPage() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "How It Works",
        description: metadata.description,
    };

    return (
        <div className="container px-4 md:px-6 mx-auto py-24 max-w-5xl">
            <JsonLd data={jsonLd} />

            <header className="max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">How Present Health Works</h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    We pair the DPC membership model with a telehealth-first care experience designed for speed, continuity, and transparency.
                </p>
            </header>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle>Direct Primary Care (DPC)</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-3">
                        <p>
                            DPC is a simple membership model: you pay a flat monthly fee for primary care access.
                            Present Health does not bill insurance for membership care.
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>More time with your doctor</li>
                            <li>Direct communication for quick questions and follow-ups</li>
                            <li>Transparent pricing for commonly needed add-ons (labs, meds)</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle>Telehealth-First Workflow</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-3">
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Join and confirm eligibility in your state</li>
                            <li>Get onboarded and share your health goals</li>
                            <li>Schedule a video or phone visit (same/next-day when available)</li>
                            <li>Care plan, follow-ups, and coordination as needed</li>
                        </ol>
                        <p>
                            When a situation needs in-person evaluation, we will help you triage and escalate appropriately.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <section className="mt-10">
                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle>What You Can Use Us For</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-3">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <div className="font-medium text-foreground">Everyday care</div>
                                <div className="mt-1">Colds, flu, rashes, UTIs (when appropriate), allergies, refills.</div>
                            </div>
                            <div>
                                <div className="font-medium text-foreground">Prevention</div>
                                <div className="mt-1">Health planning, risk reduction, screenings, lab review.</div>
                            </div>
                            <div>
                                <div className="font-medium text-foreground">Ongoing conditions</div>
                                <div className="mt-1">High blood pressure, cholesterol, diabetes support, medication management.</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg">
                    <Link href="/pricing">See Pricing</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                    <Link href="/join">Join Present Health</Link>
                </Button>
            </div>
        </div>
    );
}


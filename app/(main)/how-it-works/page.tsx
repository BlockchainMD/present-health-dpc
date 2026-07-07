import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonLd } from "@/components/seo/JsonLd";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
    title: "How It Works | Present Health",
    description: "How Present Health works: a flat $99/month physician-led heart-health membership — baseline your numbers, build a plan, manage them down.",
};

export default function HowItWorksPage() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "How It Works",
        description: metadata.description,
    };

    const steps = [
        {
            number: "1",
            title: "Join online",
            description: "$99/month, cancel anytime. No insurance needed, no copays, HSA-eligible.",
        },
        {
            number: "2",
            title: "Baseline your numbers",
            description: "ApoB, lipids, and blood pressure — plus guidance on getting a coronary calcium scan locally at transparent cash prices.",
        },
        {
            number: "3",
            title: "Video visit with physician",
            description: "Connect with a board-certified physician by video. Your numbers become a written, personalized risk-reduction plan.",
        },
        {
            number: "4",
            title: "Ongoing care",
            description: "Prescriptions, lab orders, and follow-up messaging. Continuity with your physician for chronic disease management.",
        },
    ];

    const whyVirtual = [
        {
            title: "Convenience",
            description: "No travel time, no wait in the office. Get care from home, work, or anywhere.",
        },
        {
            title: "Speed",
            description: "Same-week appointments. Most visits happen within days, not weeks.",
        },
        {
            title: "Continuity",
            description: "See the same physician who knows your history and health goals.",
        },
        {
            title: "Transparent Cost",
            description: "One flat monthly fee. No copays, no claims, no surprise bills — and cash-rate labs we help you find.",
        },
    ];

    return (
        <div className="container px-4 md:px-6 mx-auto py-24 max-w-5xl">
            <JsonLd data={jsonLd} />

            <header className="max-w-3xl mb-12">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">How Present Health Works</h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    Physician-led cardiovascular prevention through video visits and messaging — one flat monthly price.
                </p>
            </header>

            <section className="mb-16">
                <h2 className="text-2xl font-bold mb-8">The 4-Step Process</h2>
                <div className="grid gap-8">
                    {steps.map((step) => (
                        <div key={step.number} className="flex gap-6">
                            <div className="flex-shrink-0">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white font-bold text-lg">
                                    {step.number}
                                </div>
                            </div>
                            <div className="flex-grow">
                                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                                <p className="text-muted-foreground">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mb-16">
                <h2 className="text-2xl font-bold mb-8">Why Virtual Works</h2>
                <div className="grid gap-6 md:grid-cols-2">
                    {whyVirtual.map((item) => (
                        <Card key={item.title} className="border-border/60">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-start gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                                    {item.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-muted-foreground">
                                {item.description}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            <section className="mb-16">
                <Card className="border-border/60 bg-slate-50">
                    <CardHeader>
                        <CardTitle>What You Can Treat With Us</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <div className="font-semibold text-foreground mb-2">Heart-Health Prevention</div>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p>• ApoB and lipid management</p>
                                    <p>• Calcium-score follow-up</p>
                                    <p>• Blood pressure control</p>
                                    <p>• Family-history risk workups</p>
                                    <p>• Post-weight-loss maintenance</p>
                                </div>
                            </div>
                            <div>
                                <div className="font-semibold text-foreground mb-2">Acute Care</div>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p>• Colds and flu</p>
                                    <p>• Rashes and skin concerns</p>
                                    <p>• UTIs and infections</p>
                                    <p>• Allergies</p>
                                    <p>• Minor injuries</p>
                                </div>
                            </div>
                            <div>
                                <div className="font-semibold text-foreground mb-2">Chronic Conditions</div>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p>• Blood pressure management</p>
                                    <p>• Diabetes and A1C tracking</p>
                                    <p>• Thyroid management</p>
                                    <p>• Cholesterol management</p>
                                    <p>• Weight management</p>
                                </div>
                            </div>
                            <div>
                                <div className="font-semibold text-foreground mb-2">Preventive Care</div>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p>• Annual wellness visits</p>
                                    <p>• Medication refills</p>
                                    <p>• Lab ordering and interpretation</p>
                                    <p>• Specialist referrals</p>
                                    <p>• Care coordination</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <section className="mb-16 bg-slate-50 rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-3">When You Need In-Person Care</h3>
                <p className="text-muted-foreground">
                    Some conditions require a physical exam or procedure (like a pap smear, stitches, or joint injection). If clinically necessary, we'll advise you to seek local in-person care and help coordinate your plan before and after your visit.
                </p>
            </section>

            <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link href="/book">Get started</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                    <Link href="/pricing">See Pricing</Link>
                </Button>
            </div>
        </div>
    );
}

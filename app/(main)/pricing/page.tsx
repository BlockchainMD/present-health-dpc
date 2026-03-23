import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SchemaBlocks } from "@/components/seo/SchemaBlocks";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
    title: "Pricing | Present Health",
    description:
        "Your copay with insurance. $29 without. We accept most major commercial insurance plans.",
};

export default function PricingPage() {
    const whatsIncluded = [
        "Video visits with board-certified physicians",
        "Prescription management and refills",
        "Lab ordering and interpretation",
        "Follow-up messaging between visits",
        "Care coordination and specialist referrals",
    ];

    const insuranceBillingSteps = [
        {
            step: "1",
            title: "Verify your insurance",
            description: "During booking, we'll check your coverage and confirm your copay amount.",
        },
        {
            step: "2",
            title: "Pay your copay",
            description: "You pay your normal copay at the time of visit (same as any doctor visit).",
        },
        {
            step: "3",
            title: "We bill your insurance",
            description: "We handle all billing to your insurance company for the visit.",
        },
    ];

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 md:px-6 py-24 max-w-5xl">
                {/* Hero */}
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                        Simple, transparent pricing
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Your copay with insurance. $29 without.
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-3xl mx-auto">
                    {/* Insurance Card */}
                    <Card className="flex flex-col h-full border-border/70">
                        <CardHeader>
                            <CardTitle className="text-2xl">With Insurance</CardTitle>
                            <CardDescription>Most major commercial plans accepted</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-4">
                            <div>
                                <div className="text-3xl font-bold">Your Copay</div>
                                <p className="text-muted-foreground text-sm mt-1">
                                    Typically $20-50 per visit, depending on your plan
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded p-4">
                                <p className="text-sm text-muted-foreground">
                                    We accept most major commercial insurance plans. We'll verify your coverage during booking so there are no surprises.
                                </p>
                            </div>
                            <Button asChild size="lg" className="w-full">
                                <Link href="/book">Book a Visit</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Self-Pay Card */}
                    <Card className="flex flex-col h-full border-border/70">
                        <CardHeader>
                            <CardTitle className="text-2xl">Without Insurance</CardTitle>
                            <CardDescription>Self-pay option</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-4">
                            <div>
                                <div className="text-3xl font-bold">$29 per visit</div>
                                <p className="text-muted-foreground text-sm mt-1">
                                    No hidden fees, no subscription required
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded p-4">
                                <p className="text-sm text-muted-foreground">
                                    Full access to all services. Simple, transparent pricing with no surprises.
                                </p>
                            </div>
                            <Button asChild size="lg" className="w-full" variant="outline">
                                <Link href="/book">Book a Visit</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* What's Included */}
                <section className="mb-16 max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold mb-6">What's included in every visit</h2>
                    <div className="grid gap-3">
                        {whatsIncluded.map((item) => (
                            <div key={item} className="flex gap-3 items-start">
                                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{item}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Insurance Billing Explanation */}
                <section className="mb-16 max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold mb-6">How insurance billing works</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {insuranceBillingSteps.map((item) => (
                            <div key={item.step}>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold mb-4">
                                    {item.step}
                                </div>
                                <h3 className="font-semibold mb-2">{item.title}</h3>
                                <p className="text-sm text-muted-foreground">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Additional Costs */}
                <section className="mb-16 max-w-3xl mx-auto bg-slate-50 rounded-lg p-6">
                    <h3 className="font-semibold text-lg mb-3">Additional costs to know about</h3>
                    <div className="space-y-2 text-muted-foreground text-sm">
                        <p>
                            <span className="font-medium text-foreground">Lab and imaging costs:</span> If we order labs or imaging, costs are billed separately at transparent, market rates.
                        </p>
                        <p>
                            <span className="font-medium text-foreground">Medications:</span> Prescriptions are filled at your pharmacy, subject to your insurance coverage or self-pay pricing.
                        </p>
                        <p>
                            <span className="font-medium text-foreground">In-person care:</span> If we refer you for in-person evaluation or procedures, those are handled by the local provider.
                        </p>
                    </div>
                </section>

                {/* CTA */}
                <div className="text-center mb-8">
                    <Button asChild size="lg" className="px-8 h-12">
                        <Link href="/book">Book Your First Visit</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

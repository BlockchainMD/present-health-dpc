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
        "One flat price: $99/month individual, $179/month household. No insurance needed, no copays, HSA-eligible.",
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
            title: "Join online",
            description: "Choose individual ($99/mo) or household ($179/mo). Pay by card — HSA cards work for qualifying memberships.",
        },
        {
            step: "2",
            title: "One flat monthly charge",
            description: "No claims, no copays, no surprise bills. Cancel anytime.",
        },
        {
            step: "3",
            title: "Labs at transparent cash rates",
            description: "When we order labs or imaging, we route you to the best local cash prices — often less than insurance rates.",
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
                        One flat monthly price. No insurance needed, no copays, HSA-eligible.
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-3xl mx-auto">
                    {/* Individual Card */}
                    <Card className="flex flex-col h-full border-border/70">
                        <CardHeader>
                            <CardTitle className="text-2xl">Individual</CardTitle>
                            <CardDescription>Physician-led heart-health membership</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-4">
                            <div>
                                <div className="text-3xl font-bold">$99/month</div>
                                <p className="text-muted-foreground text-sm mt-1">
                                    Visits, messaging, your prevention plan, and ongoing management — all included
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded p-4">
                                <p className="text-sm text-muted-foreground">
                                    HSA-eligible under the 2026 rules for direct primary care memberships. Cancel anytime.
                                </p>
                            </div>
                            <Button asChild size="lg" className="w-full">
                                <Link href="/join">Become a founding member</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Household Card */}
                    <Card className="flex flex-col h-full border-border/70">
                        <CardHeader>
                            <CardTitle className="text-2xl">Household</CardTitle>
                            <CardDescription>Two adults, one membership</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-4">
                            <div>
                                <div className="text-3xl font-bold">$179/month</div>
                                <p className="text-muted-foreground text-sm mt-1">
                                    Both members get full physician access and their own prevention plans
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded p-4">
                                <p className="text-sm text-muted-foreground">
                                    Under the $300/month family HSA limit for direct primary care. Cancel anytime.
                                </p>
                            </div>
                            <Button asChild size="lg" className="w-full" variant="outline">
                                <Link href="/join">Join as a household</Link>
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

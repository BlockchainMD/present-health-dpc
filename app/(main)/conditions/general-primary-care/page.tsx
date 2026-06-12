import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
    title: "General Primary Care | Present Health",
    description:
        "Comprehensive primary care for acute and chronic conditions including sick visits, wellness exams, and preventive care through video visits.",
};

export default function GeneralPrimaryCarePage() {
    const whatWeDo = [
        "Acute care for colds, flu, rashes, UTIs, and more",
        "Annual wellness exams and preventive care",
        "Medication refills and management",
        "Lab ordering and interpretation",
        "Specialist referrals and care coordination",
    ];

    const howItWorks = [
        "Choose membership or a single visit to start",
        "Discuss your symptoms or health concerns",
        "Receive diagnosis and treatment plan",
        "Get prescriptions or lab orders as needed",
        "Follow-up care and coordination",
    ];

    return (
        <div className="min-h-screen bg-background py-24">
            <div className="container mx-auto px-4 md:px-6 max-w-4xl">
                <header className="mb-16 text-center max-w-3xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">General Primary Care</h1>
                    <p className="text-lg text-muted-foreground">
                        Comprehensive primary care for acute and chronic conditions including sick visits, wellness exams, and preventive care through convenient video visits.
                    </p>
                </header>

                <section className="mb-16">
                    <h2 className="text-2xl font-bold mb-8">What We Do</h2>
                    <Card className="border-border/70">
                        <CardContent className="pt-6">
                            <div className="grid gap-4">
                                {whatWeDo.map((item) => (
                                    <div key={item} className="flex gap-3 items-start">
                                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                        <span className="text-muted-foreground">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section className="mb-16">
                    <h2 className="text-2xl font-bold mb-8">How It Works</h2>
                    <div className="grid md:grid-cols-5 gap-4">
                        {howItWorks.map((step, idx) => (
                            <div key={step} className="relative">
                                <Card className="border-border/70 h-full">
                                    <CardContent className="p-4 text-center">
                                        <div className="text-2xl font-bold text-primary mb-2">{idx + 1}</div>
                                        <p className="text-sm text-muted-foreground">{step}</p>
                                    </CardContent>
                                </Card>
                                {idx < howItWorks.length - 1 && (
                                    <div className="hidden md:block absolute right-0 top-1/2 translate-x-full -translate-y-1/2 w-4 h-0.5 bg-border" />
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-16 bg-slate-50 rounded-lg p-8">
                    <h2 className="text-2xl font-bold mb-4">Full-Spectrum Primary Care</h2>
                    <p className="text-muted-foreground mb-4">
                        Present Health provides the same scope of primary care as a traditional office-based practice. Whether you need help with an acute illness, ongoing chronic disease management, or preventive wellness care, we're here to manage your health comprehensively through convenient video visits.
                    </p>
                </section>

                <section className="mb-16">
                    <h2 className="text-2xl font-bold mb-8">Pricing</h2>
                    <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                        <Card className="border-border/70">
                            <CardHeader>
                                <CardTitle className="text-lg">With Insurance</CardTitle>
                            </CardHeader>
                            <CardContent className="text-muted-foreground">
                                <p className="font-semibold text-foreground mb-2">Your Copay</p>
                                <p className="text-sm">Typically $20-50 per visit depending on your insurance plan.</p>
                            </CardContent>
                        </Card>
                        <Card className="border-border/70">
                            <CardHeader>
                                <CardTitle className="text-lg">Without Insurance</CardTitle>
                            </CardHeader>
                            <CardContent className="text-muted-foreground">
                                <p className="font-semibold text-foreground mb-2">$29 per visit</p>
                                <p className="text-sm">No hidden fees or subscriptions required.</p>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <div className="text-center">
                    <Button asChild size="lg" className="px-8 h-12">
                        <Link href="/book">Get started</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

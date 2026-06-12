import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
    title: "Blood Pressure Management | Present Health",
    description:
        "Board-certified physicians managing your blood pressure through convenient video visits. Regular monitoring, medication management, and lifestyle support.",
};

export default function BloodPressurePage() {
    const whatWeDo = [
        "Regular blood pressure monitoring and tracking",
        "Medication management and optimization",
        "Lab work and kidney function testing",
        "Lifestyle counseling and support",
        "Coordination with specialists when needed",
    ];

    const howItWorks = [
        "Choose membership or a single visit to start",
        "Discuss your BP readings and health goals",
        "Receive medication adjustments if needed",
        "Get labs ordered and scheduled",
        "Follow-up messaging and ongoing support",
    ];

    return (
        <div className="min-h-screen bg-background py-24">
            <div className="container mx-auto px-4 md:px-6 max-w-4xl">
                {/* Hero */}
                <header className="mb-16 text-center max-w-3xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Blood Pressure Management</h1>
                    <p className="text-lg text-muted-foreground">
                        Regular monitoring and medication management for hypertension, managed through convenient video visits with a board-certified physician.
                    </p>
                </header>

                {/* What We Do */}
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

                {/* How It Works */}
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

                {/* Why Virtual Works */}
                <section className="mb-16 bg-slate-50 rounded-lg p-8">
                    <h2 className="text-2xl font-bold mb-4">Why Virtual Works for Blood Pressure Management</h2>
                    <p className="text-muted-foreground mb-4">
                        Blood pressure management is ideal for virtual care. You can check your readings at home and share them with your physician during video visits. Regular monitoring and medication adjustments don't require in-person visits, making virtual care more convenient and often more frequent than traditional care.
                    </p>
                </section>

                {/* Pricing */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold mb-8">Pricing</h2>
                    <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                        <Card className="border-border/70">
                            <CardHeader>
                                <CardTitle className="text-lg">Membership</CardTitle>
                            </CardHeader>
                            <CardContent className="text-muted-foreground">
                                <p className="font-semibold text-foreground mb-2">$99/month individual</p>
                                <p className="text-sm">Ongoing primary care access, messaging, visits when clinically appropriate, and follow-up.</p>
                            </CardContent>
                        </Card>
                        <Card className="border-border/70">
                            <CardHeader>
                                <CardTitle className="text-lg">Single visit</CardTitle>
                            </CardHeader>
                            <CardContent className="text-muted-foreground">
                                <p className="font-semibold text-foreground mb-2">$99/visit request</p>
                                <p className="text-sm">One focused concern when membership is not the right next step yet.</p>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* CTA */}
                <div className="text-center">
                    <Button asChild size="lg" className="px-8 h-12">
                        <Link href="/book">Get started</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
    title: "Cardiovascular-Prevention Primary Care in Michigan | Present Health",
    description:
        "Physician-led heart-disease prevention for Michigan residents, delivered by video from anywhere in the state. Flat $99/month individual, $179/month household, no insurance billing, HSA-eligible.",
    alternates: {
        canonical: absoluteUrl("/michigan"),
    },
};

export default function MichiganPage() {
    const whoItsFor = [
        "You live or work anywhere in Michigan — Detroit, Grand Rapids, Ann Arbor, Lansing, Traverse City, the U.P. — and want prevention care without a drive to the office",
        "You have a family history of early heart disease, a high cholesterol or blood-pressure number, or a calcium score you want a plan for",
        "You'd rather pay a flat monthly fee and message your physician than fight a fifteen-minute insurance visit twice a year",
    ];

    const howItWorks = [
        "You meet a Michigan-licensed, board-certified physician by secure video — no waiting room, no commute across the state",
        "Prevention labs like Lp(a), ApoB, and a lipid panel are ordered up front at transparent cash prices and drawn at a lab near you",
        "You get a written plan for your numbers, plus ongoing messaging and quarterly follow-through so drift is caught in months, not years",
        "Prescriptions, when appropriate, are sent electronically to a Michigan pharmacy you choose",
    ];

    const whyPrevention = [
        "Heart disease is a leading cause of death in Michigan, and most of the risk builds silently for years before any symptom",
        "The markers that matter most for early risk — Lp(a), ApoB, a coronary calcium score — are rarely part of a standard Michigan physical",
        "Caught early, cardiovascular risk is one of the most modifiable situations in medicine; the usual problem isn't that nothing can be done, it's that no one looked in time",
    ];

    return (
        <div className="container px-4 md:px-6 mx-auto py-24 max-w-3xl">
            <header className="mb-10">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                    Heart-disease prevention for Michigan, wherever you are in the state
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    Present Health is a Michigan-based membership practice built around one thing standard care usually
                    rushes past: finding and lowering your cardiovascular risk before it becomes an event. Everything is
                    done by video and secure messaging, so the same physician is available whether you&apos;re in metro
                    Detroit or the Upper Peninsula.
                </p>
            </header>

            <section className="space-y-6 text-muted-foreground">
                <h2 className="text-2xl font-bold text-foreground">Who this is for</h2>
                <div className="grid gap-3">
                    {whoItsFor.map((item) => (
                        <div key={item} className="flex gap-3 items-start">
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>

                <h2 className="text-2xl font-bold text-foreground">Why prevention, and why now</h2>
                <div className="grid gap-3">
                    {whyPrevention.map((item) => (
                        <div key={item} className="flex gap-3 items-start">
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
                <p>
                    If your{" "}
                    <Link href="/calcium-score" className="text-primary underline underline-offset-4">
                        calcium score came back high
                    </Link>{" "}
                    or{" "}
                    <Link href="/family-history" className="text-primary underline underline-offset-4">
                        heart disease runs in your family
                    </Link>
                    , those guides walk through exactly what the numbers mean and what to do next.
                </p>

                <h2 className="text-2xl font-bold text-foreground">How care works across Michigan</h2>
                <Card className="border-border/70">
                    <CardHeader>
                        <CardTitle>Statewide telehealth, one flat membership</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {howItWorks.map((item) => (
                            <div key={item} className="flex gap-3 items-start">
                                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{item}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <h2 className="text-2xl font-bold text-foreground">Simple Michigan pricing</h2>
                <p>
                    Flat $99/month for an individual or $179/month for a household. No insurance is billed, so there are
                    no surprise statements and no coverage runaround — you always know what you pay. Memberships are{" "}
                    <Link href="/hsa" className="text-primary underline underline-offset-4">
                        HSA-eligible
                    </Link>{" "}
                    under the 2026 direct-primary-care rules. Labs and imaging aren&apos;t bundled into the fee; you pay
                    those separately at transparent cash rates, so the membership stays a straightforward primary-care
                    relationship focused on your numbers. If you&apos;re weighing choices, see{" "}
                    <Link href="/compare" className="text-primary underline underline-offset-4">
                        how Present Health compares
                    </Link>{" "}
                    to concierge medicine, One Medical, and lab-testing subscriptions.
                </p>

                <h2 className="text-2xl font-bold text-foreground">Honest fine print</h2>
                <p>
                    This page is general information, not medical advice. Present Health is a Michigan-based cash-pay
                    membership and does not bill insurance; care is available to residents located in Michigan at the
                    time of a visit. Which prevention tests make sense is a decision you make with your physician — not
                    every test is right for every person. For emergencies, call 911 or go to the nearest emergency
                    department.
                </p>

                <div className="pt-6 flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild size="lg" className="h-12 px-8">
                        <Link href="/join">Start Membership — $99/month</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="h-12 px-8">
                        <Link href="/pricing">See what&apos;s included</Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}

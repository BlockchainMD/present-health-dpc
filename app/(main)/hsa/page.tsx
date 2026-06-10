import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
    title: "Can You Use Your HSA for Direct Primary Care in 2026? | Present Health",
    description:
        "Yes — as of January 1, 2026, direct primary care memberships up to $150/month ($300/month family) are HSA-qualified. Here's how the new rules work and how Present Health's $99/month membership fits.",
};

export default function HsaPage() {
    const qualifyingPoints = [
        "The membership fee is a fixed monthly amount: up to $150/month for an individual or $300/month for a household (2026 limits, inflation-adjusted after 2027)",
        "The arrangement covers primary care services provided by primary care practitioners",
        "Your membership fee is the practice's only compensation for those covered services",
    ];

    const presentHealthFit = [
        "$99/month individual and $179/month household — both under the federal caps",
        "Fixed monthly fee, primary care only — the qualifying structure",
        "Labs and imaging are not bundled into the membership; you pay those separately at transparent cash rates (and can often use HSA funds for those too)",
    ];

    return (
        <div className="container px-4 md:px-6 mx-auto py-24 max-w-3xl">
            <header className="mb-10">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                    Using your HSA for direct primary care: the 2026 rules
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    For years, joining a direct primary care (DPC) practice could jeopardize your HSA. That changed on
                    January 1, 2026. Here is what the new federal rules actually say — and what they mean for a
                    membership like Present Health.
                </p>
            </header>

            <section className="space-y-6 text-muted-foreground">
                <h2 className="text-2xl font-bold text-foreground">What changed</h2>
                <p>
                    Under the 2025 federal budget law (often called OBBBA) and IRS guidance issued for 2026, a
                    qualifying direct primary care arrangement no longer blocks you from contributing to a Health
                    Savings Account — and the membership fee itself is treated as a qualified medical expense you can
                    pay with HSA funds.
                </p>

                <h2 className="text-2xl font-bold text-foreground">What makes a DPC membership qualify</h2>
                <div className="grid gap-3">
                    {qualifyingPoints.map((item) => (
                        <div key={item} className="flex gap-3 items-start">
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
                <p>
                    Memberships that bundle prescription drugs (other than vaccines), certain lab services, or
                    procedures requiring general anesthesia do not qualify — which is why well-structured DPC practices
                    keep those costs separate and transparent.
                </p>

                <h2 className="text-2xl font-bold text-foreground">How Present Health fits</h2>
                <Card className="border-border/70">
                    <CardHeader>
                        <CardTitle>Designed under the caps</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {presentHealthFit.map((item) => (
                            <div key={item} className="flex gap-3 items-start">
                                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{item}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <h2 className="text-2xl font-bold text-foreground">Honest fine print</h2>
                <p>
                    HSA rules depend on your specific plan and circumstances — confirm with your HSA administrator or
                    tax advisor before relying on this. One open area: whether employer HRA arrangements (including
                    ICHRAs) can reimburse DPC fees rests on regulations that were proposed in 2020 but never finalized,
                    so we do not make that claim. This page is general information, not tax advice.
                </p>

                <div className="pt-6 text-center">
                    <Button asChild size="lg" className="h-12 px-8">
                        <Link href="/join">Start Membership — $99/month</Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}

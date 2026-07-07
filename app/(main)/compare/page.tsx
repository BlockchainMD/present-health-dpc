import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
    title: "How Present Health Compares — Membership Medicine Options in 2026 | Present Health",
    description:
        "One Medical, concierge medicine, lab-testing subscriptions, and direct primary care compared honestly — what each costs, what the fee actually covers, and where a $99/month cardiovascular-prevention membership fits.",
};

type ComparisonRow = {
    name: string;
    price: string;
    covers: string;
    watchFor: string;
};

const OPTIONS: ComparisonRow[] = [
    {
        name: "Present Health",
        price: "$99/mo individual · $179/mo household",
        covers: "Ongoing physician-led cardiovascular prevention: baseline labs ordered, a written risk-reduction plan, unlimited messaging, video visits, prescriptions, and scheduled re-tests. No insurance involved.",
        watchFor: "Labs and imaging are billed separately at cash rates. Telehealth-only — if you need hands-on care, we refer and coordinate locally. Michigan first; not a fit if you want in-office visits.",
    },
    {
        name: "One Medical (Amazon)",
        price: "$199/yr ($99/yr with Prime)",
        covers: "The membership fee covers 24/7 on-demand virtual care through the app. Scheduled visits, physicals, and chronic-condition management are billed separately to you or your insurance.",
        watchFor: "The low membership price is an access fee, not care coverage — office visits still generate normal insurance bills, and there are no Michigan offices. Ongoing prevention management is not the product.",
    },
    {
        name: "Concierge medicine",
        price: "Commonly ~$1,500–$10,000+/yr",
        covers: "Enhanced access to a local physician — smaller panels, longer visits, same-day availability, usually in person.",
        watchFor: "Most concierge practices still bill your insurance for visits on top of the annual fee. Excellent access, at several times the cost of a DPC membership.",
    },
    {
        name: "Lab-testing subscriptions (e.g., Function Health)",
        price: "~$499/yr",
        covers: "Large annual lab panels (100+ biomarkers) with results explanations and a follow-up re-test. A genuinely useful data product.",
        watchFor: "Testing is not treatment: these services state they do not provide diagnosis, prescriptions, or ongoing medical management. If a result is abnormal, you still need a physician to act on it — that layer is what a care membership is for.",
    },
    {
        name: "Traditional primary care via insurance",
        price: "Copays + deductible on top of premiums",
        covers: "In-person care, procedures, and the full referral network — things telehealth cannot replace.",
        watchFor: "Average visit lengths are short and prevention follow-through between annual physicals is rare. Many members keep their insurance for catastrophes and use a membership for continuous prevention work.",
    },
];

export default function ComparePage() {
    const bestFit = [
        "You have a specific reason to take heart risk seriously — family history, a high calcium score, creeping blood pressure, or a weight-loss program that just ended",
        "You want one physician who baselines your numbers, writes an actual plan, and re-tests on a schedule — not a new clinician each visit",
        "You're comfortable with telehealth-first care and paying a flat monthly fee instead of per-visit insurance billing",
    ];

    return (
        <div className="container px-4 md:px-6 mx-auto py-24 max-w-4xl">
            <header className="mb-10">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                    How Present Health compares to your other options
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    Membership medicine now comes in several very different shapes — and the honest answer is that
                    each solves a different problem. Here is what each model costs, what the fee actually covers, and
                    where we fit.
                </p>
            </header>

            <section className="space-y-6">
                {OPTIONS.map((option) => (
                    <Card key={option.name} className={option.name === "Present Health" ? "border-primary/60 border-2" : "border-border/70"}>
                        <CardHeader className="pb-2">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <CardTitle className="text-xl">{option.name}</CardTitle>
                                <span className="text-sm font-semibold text-primary">{option.price}</span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-muted-foreground">
                            <p>
                                <span className="font-medium text-foreground">What the fee covers: </span>
                                {option.covers}
                            </p>
                            <p>
                                <span className="font-medium text-foreground">Worth knowing: </span>
                                {option.watchFor}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </section>

            <section className="mt-12 space-y-6 text-muted-foreground">
                <h2 className="text-2xl font-bold text-foreground">The pattern behind the prices</h2>
                <p>
                    Low membership fees usually buy <em>access</em> (an app, on-demand urgent questions) with care
                    billed separately. High concierge fees buy <em>availability</em> (a doctor who answers, often in
                    person). Lab subscriptions sell <em>data</em> without treatment. A direct primary care membership
                    like ours sits in the middle on price because the fee <em>is</em> the care: the plan, the
                    prescriptions, the follow-through, and the re-testing are all inside the flat monthly rate.
                </p>
                <p>
                    We are also deliberately narrow. Cardiovascular risk is the thing we baseline, plan against, and
                    re-test — because it is the leading cause of death and the most measurable, most modifiable risk
                    most adults carry. Full-scope primary care is included, but prevention is the point.
                </p>

                <h2 className="text-2xl font-bold text-foreground">Present Health is the right fit if…</h2>
                <div className="grid gap-3">
                    {bestFit.map((item) => (
                        <div key={item} className="flex gap-3 items-start">
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
                <p>
                    Not sure where you land? Start with the guide that matches your situation:{" "}
                    <Link href="/family-history" className="text-primary underline underline-offset-4">heart disease in your family</Link>,{" "}
                    <Link href="/calcium-score" className="text-primary underline underline-offset-4">a high calcium score</Link>,{" "}
                    <Link href="/after-weight-loss" className="text-primary underline underline-offset-4">after a weight-loss program</Link>, or{" "}
                    <Link href="/hsa" className="text-primary underline underline-offset-4">paying with your HSA</Link>.
                </p>

                <h2 className="text-2xl font-bold text-foreground">Honest fine print</h2>
                <p>
                    Competitor prices and coverage descriptions above were checked against each company&apos;s public
                    pricing pages in July 2026 and may change; concierge fees vary widely by practice and market, so we
                    quote industry ranges rather than any single practice&apos;s fee. Present Health is a flat-fee
                    medical membership, not health insurance, and does not replace emergency or hospital coverage. If
                    another model on this page fits your situation better, use it — an engaged physician relationship
                    anywhere beats none.
                </p>

                <div className="pt-6 flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild size="lg" className="h-12 px-8">
                        <Link href="/join">Start Membership — $99/month</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="h-12 px-8">
                        <Link href="/pricing">See full pricing</Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}

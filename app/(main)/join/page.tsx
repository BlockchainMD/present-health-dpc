import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/JsonLd";
import {
    HOUSEHOLD_ANNUAL_DOLLARS,
    HOUSEHOLD_ANNUAL_SAVINGS_DOLLARS,
    HOUSEHOLD_MONTHLY_DOLLARS,
    MEMBERSHIP_ANNUAL_DOLLARS,
    MEMBERSHIP_ANNUAL_SAVINGS_DOLLARS,
    MEMBERSHIP_MONTHLY_DOLLARS,
    SINGLE_VISIT_DOLLARS,
} from "@/lib/pricing";

export const metadata: Metadata = {
    title: "Join | Present Health",
    description:
        "Start your heart-health membership: $99/month individual or $179/month household. A board-certified physician baselines your numbers and manages them down. No insurance needed, HSA-eligible.",
};

const INDIVIDUAL_FEATURES = [
    "Baseline labs ordered in week one — ApoB, lipids, blood pressure review",
    "A written cardiovascular risk-reduction plan from your physician",
    "Unlimited secure messaging, photos, and voice memos",
    "Video visits when clinically appropriate",
    "Prescriptions, labs, and scheduled re-tests to track your trend",
];

const HOUSEHOLD_FEATURES = [
    "Everything in Individual — for two adults in the same household",
    "Each member gets their own baseline labs and prevention plan",
    "One bill, one membership, both of you covered",
    "Under the $300/month household HSA cap for direct primary care",
];

const SINGLE_VISIT_FEATURES = [
    "One focused clinical issue, no membership required",
    "Messaging-first review and next steps from a licensed clinician",
    "Video visit when clinically appropriate",
    "Good fit if you want help now before deciding on membership",
];

export default function JoinPage() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Join Present Health",
        description: metadata.description,
    };

    return (
        <div className="container px-4 md:px-6 mx-auto py-20 max-w-6xl">
            <JsonLd data={jsonLd} />

            <header className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Founding memberships — Michigan</p>
                <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight">Know your numbers. Then watch them improve.</h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    A board-certified physician baselines your ApoB, blood pressure, and calcium-score status — then
                    builds and manages a plan to bring your risk down. Choose the membership that fits, or start with a
                    single visit.
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span>Adults 18+ only</span>
                    <span>Available in select states</span>
                    <span>No insurance required</span>
                    <span>HSA-eligible membership</span>
                </div>
            </header>

            <section className="mt-12 grid gap-6 md:grid-cols-3">
                <div className="rounded-xl border-2 border-primary p-4 flex h-full flex-col">
                    <div>
                        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Most popular</div>
                        <h2 className="mt-3 text-2xl font-semibold">Individual Membership</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Physician-led heart-health prevention for one adult, built on messaging-first access and continuity.
                        </p>
                    </div>

                    <div className="mt-6">
                        <div className="text-4xl font-bold">
                            ${MEMBERSHIP_MONTHLY_DOLLARS}
                            <span className="ml-1 text-lg font-normal text-muted-foreground">/month</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Or ${MEMBERSHIP_ANNUAL_DOLLARS}/year and save ${MEMBERSHIP_ANNUAL_SAVINGS_DOLLARS} — two months free.
                        </p>
                    </div>

                    <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                        {INDIVIDUAL_FEATURES.map((item) => (
                            <li key={item} className="flex gap-2">
                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-auto pt-6">
                        <div className="grid gap-3">
                            <Button asChild size="lg" className="w-full">
                                <Link href="/register?plan=individual&billing=monthly">Start Monthly Membership</Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="w-full">
                                <Link href="/register?plan=individual&billing=annual">Choose Annual Billing</Link>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-border p-4 flex h-full flex-col">
                    <div>
                        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Two adults</div>
                        <h2 className="mt-3 text-2xl font-semibold">Household Membership</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Two adults in the same household, each with their own physician relationship and prevention plan.
                        </p>
                    </div>

                    <div className="mt-6">
                        <div className="text-4xl font-bold">
                            ${HOUSEHOLD_MONTHLY_DOLLARS}
                            <span className="ml-1 text-lg font-normal text-muted-foreground">/month</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Or ${HOUSEHOLD_ANNUAL_DOLLARS}/year and save ${HOUSEHOLD_ANNUAL_SAVINGS_DOLLARS} — two months free.
                        </p>
                    </div>

                    <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                        {HOUSEHOLD_FEATURES.map((item) => (
                            <li key={item} className="flex gap-2">
                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-auto pt-6">
                        <div className="grid gap-3">
                            <Button asChild size="lg" className="w-full">
                                <Link href="/register?plan=family&billing=monthly">Start Household Membership</Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="w-full">
                                <Link href="/register?plan=family&billing=annual">Choose Annual Billing</Link>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-border p-4 flex h-full flex-col">
                    <div>
                        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">One issue right now</div>
                        <h2 className="mt-3 text-2xl font-semibold">Single Visit</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            A lower-friction way to raise your hand, tell us what is going on, and get a response from the team.
                        </p>
                    </div>

                    <div className="mt-6">
                        <div className="text-4xl font-bold">
                            ${SINGLE_VISIT_DOLLARS}
                            <span className="ml-1 text-lg font-normal text-muted-foreground">/visit</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">No membership commitment required to start.</p>
                    </div>

                    <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                        {SINGLE_VISIT_FEATURES.map((item) => (
                            <li key={item} className="flex gap-2">
                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-auto pt-6">
                        <Button asChild size="lg" variant="outline" className="w-full">
                            <Link href="/visit">Request Single Visit</Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="mt-10 rounded-2xl border border-border bg-muted/20 p-6">
                <h2 className="text-lg font-semibold">What happens next</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm text-muted-foreground">
                    <div>
                        <p className="font-medium text-foreground">1. Enter your details</p>
                        <p className="mt-1">Basic information and your state — we confirm eligibility before checkout, so there are no surprises.</p>
                    </div>
                    <div>
                        <p className="font-medium text-foreground">2. Secure checkout</p>
                        <p className="mt-1">Pay by card — HSA cards work for qualifying memberships. Cancel anytime.</p>
                    </div>
                    <div>
                        <p className="font-medium text-foreground">3. Baseline your numbers</p>
                        <p className="mt-1">Your physician orders week-one labs and turns the results into a written risk-reduction plan.</p>
                    </div>
                </div>
            </section>

            <section className="mt-8 text-sm text-muted-foreground">
                <p>
                    Wondering how we compare to other options, or whether your situation fits? See{" "}
                    <Link href="/compare" className="text-primary underline underline-offset-4">how Present Health compares</Link>,{" "}
                    <Link href="/family-history" className="text-primary underline underline-offset-4">heart disease in your family</Link>,{" "}
                    <Link href="/calcium-score" className="text-primary underline underline-offset-4">a high calcium score</Link>, or{" "}
                    <Link href="/hsa" className="text-primary underline underline-offset-4">the 2026 HSA rules</Link>.
                </p>
            </section>
        </div>
    );
}

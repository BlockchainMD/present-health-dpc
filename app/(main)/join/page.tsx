import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/JsonLd";
import {
    MEMBERSHIP_ANNUAL_DOLLARS,
    MEMBERSHIP_ANNUAL_SAVINGS_DOLLARS,
    MEMBERSHIP_MONTHLY_DOLLARS,
    SINGLE_VISIT_DOLLARS,
} from "@/lib/pricing";

export const metadata: Metadata = {
    title: "Join | Present Health",
    description:
        "Choose the best next step for care: ongoing membership for $99/month or a $99 single-visit request. Messaging-first primary care for adults 18+.",
};

const MEMBERSHIP_FEATURES = [
    "Unlimited secure messaging, photos, and voice memos",
    "Typical response time within 4 business hours (M-F 8am-8pm ET)",
    "Video visits when clinically appropriate",
    "Prescriptions, labs, and ongoing care navigation included in the workflow",
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
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Choose your path</p>
                <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight">Get care without getting stuck in the system.</h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    If you want ongoing access, start with the membership. If you just need help with one issue, request a single visit.
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span>Adults 18+ only</span>
                    <span>Available in select states</span>
                    <span>No insurance required</span>
                </div>
            </header>

            <section className="mt-12 grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-border p-4 flex h-full flex-col">
                    <div>
                        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Best for ongoing care</div>
                        <h2 className="mt-3 text-2xl font-semibold">Membership</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Full-service primary care built around messaging-first access and continuity.
                        </p>
                    </div>

                    <div className="mt-6">
                        <div className="text-4xl font-bold">
                            ${MEMBERSHIP_MONTHLY_DOLLARS}
                            <span className="ml-1 text-lg font-normal text-muted-foreground">/month</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Or ${MEMBERSHIP_ANNUAL_DOLLARS}/year and save ${MEMBERSHIP_ANNUAL_SAVINGS_DOLLARS}.
                        </p>
                    </div>

                    <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                        {MEMBERSHIP_FEATURES.map((item) => (
                            <li key={item} className="flex gap-2">
                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-6 rounded-lg border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
                        Create your account, confirm state eligibility, and continue to secure checkout.
                    </div>

                    <div className="mt-auto pt-3">
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
                        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Best for one issue right now</div>
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

                    <div className="mt-6 rounded-lg border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
                        Submit a quick request and we will follow up by email to confirm fit, timing, and next steps.
                    </div>

                    <div className="mt-auto pt-3">
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
                        <p className="font-medium text-foreground">1. Choose the lowest-friction next step</p>
                        <p className="mt-1">Membership if you want ongoing access, single visit if you want help with one issue.</p>
                    </div>
                    <div>
                        <p className="font-medium text-foreground">2. Confirm state availability</p>
                        <p className="mt-1">We verify state eligibility before care starts so there are no surprises.</p>
                    </div>
                    <div>
                        <p className="font-medium text-foreground">3. Get moving quickly</p>
                        <p className="mt-1">You either continue straight to enrollment or hear back from the team about your single-visit request.</p>
                    </div>
                </div>
            </section>
        </div>
    );
}

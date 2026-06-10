import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SingleVisitRequestForm } from "@/components/visit/SingleVisitRequestForm";
import { MEMBERSHIP_MONTHLY_DOLLARS, SINGLE_VISIT_DOLLARS } from "@/lib/pricing";

export const metadata: Metadata = {
    title: "Single Visit | Present Health",
    description: "Need help with one issue? Request a single messaging-first primary care visit for $99.",
};

const SINGLE_VISIT_INCLUDED = [
    "A focused review of one concern by the Present Health care team",
    "Secure messaging-first care with video when clinically appropriate",
    "Clear next steps, guidance, and coordination when local care is needed",
];

const SINGLE_VISIT_NOTES = [
    "Adults 18+ only",
    "Available in select states",
    "Emergency symptoms still require 911 or emergency department care",
];

export default function VisitPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-16 md:py-24">
            <div className="container px-4 md:px-6 mx-auto max-w-6xl">
                <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
                    <section>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Single-issue support</p>
                        <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight">Just need one visit? Start here.</h1>
                        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                            If you do not need ongoing membership yet, submit a single-visit request and we will follow up with fit,
                            availability, and next steps.
                        </p>

                        <div className="mt-8 rounded-2xl border border-border bg-background p-6 shadow-sm">
                            <div className="text-4xl font-bold">
                                ${SINGLE_VISIT_DOLLARS}
                                <span className="ml-1 text-lg font-normal text-muted-foreground">/visit</span>
                            </div>
                            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                                {SINGLE_VISIT_INCLUDED.map((item) => (
                                    <li key={item} className="flex gap-2">
                                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-6 rounded-lg border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                                We review requests during business hours and follow up by email. This page is for non-emergency concerns only.
                            </div>
                            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                                {SINGLE_VISIT_NOTES.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-8 rounded-2xl border border-border bg-background p-6 shadow-sm">
                            <h2 className="text-xl font-semibold">Need ongoing access instead?</h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Membership is {`$${MEMBERSHIP_MONTHLY_DOLLARS}/month`} and includes unlimited messaging-first care.
                            </p>
                            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                                <Button asChild>
                                    <Link href="/join">See membership options</Link>
                                </Button>
                                <Button asChild variant="outline">
                                    <Link href="/pricing">Compare membership vs single visit</Link>
                                </Button>
                            </div>
                        </div>
                    </section>

                    <aside>
                        <SingleVisitRequestForm />
                    </aside>
                </div>
            </div>
        </div>
    );
}

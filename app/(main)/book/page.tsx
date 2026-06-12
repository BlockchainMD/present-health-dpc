import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, MessageSquareText, Users } from "lucide-react";

import { BookChoiceLink } from "@/components/book/BookChoiceLink";
import { SINGLE_VISIT_DOLLARS } from "@/lib/pricing";

export const metadata: Metadata = {
    title: "Start Care | Present Health",
    description:
        "Choose how to start with Present Health: ongoing membership or a single-visit request.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const MEMBERSHIP_PRICE_LINE = "$99/mo individual · $179/mo household · HSA-eligible";

const MEMBERSHIP_POINTS = [
    "Ongoing founder-clinician primary care",
    "Messaging-first access with video when clinically appropriate",
    "Best fit when you want continuity and proactive follow-up",
];

const SINGLE_VISIT_POINTS = [
    "One focused concern, no membership required",
    "Messaging-first review and next steps from the care team",
    "Good fit if you want help now before deciding on membership",
];

function buildHrefWithSearchParams(
    pathname: string,
    params: Record<string, string | string[] | undefined>
) {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (typeof value === "string") {
            query.append(key, value);
            continue;
        }

        if (Array.isArray(value)) {
            for (const item of value) {
                if (typeof item === "string") query.append(key, item);
            }
        }
    }

    const search = query.toString();
    return search ? `${pathname}?${search}` : pathname;
}

export default async function BookPage({ searchParams }: { searchParams: SearchParams }) {
    const params = await searchParams;
    const joinHref = buildHrefWithSearchParams("/join", params);

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
                <header className="mx-auto max-w-3xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Start care</p>
                    <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
                        How do you want to start?
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Choose ongoing membership for direct primary care access, or request help with one focused concern.
                    </p>
                </header>

                <section className="mt-10 grid gap-4 md:grid-cols-2" aria-label="Choose a care path">
                    <BookChoiceLink
                        href={joinHref}
                        choice="membership"
                        label="membership"
                        className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        aria-label="Start membership"
                    >
                        <article className="flex h-full flex-col rounded-lg border-2 border-primary bg-primary/5 p-6 shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <span className="inline-flex rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                                        Primary path
                                    </span>
                                    <h2 className="mt-4 text-2xl font-semibold tracking-tight">Membership</h2>
                                </div>
                                <Users className="h-7 w-7 text-primary" aria-hidden="true" />
                            </div>

                            <p className="mt-4 text-lg font-semibold text-foreground">{MEMBERSHIP_PRICE_LINE}</p>
                            <p className="mt-3 text-sm text-muted-foreground">
                                Start here for relationship-based care, prevention work, medication support, and ongoing access.
                            </p>

                            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                                {MEMBERSHIP_POINTS.map((item) => (
                                    <li key={item} className="flex gap-2">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-auto pt-6">
                                <span className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition group-hover:bg-primary/90">
                                    Start membership
                                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </span>
                            </div>
                        </article>
                    </BookChoiceLink>

                    <BookChoiceLink
                        href="/visit"
                        choice="single_visit"
                        label="single_visit"
                        className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        aria-label="Request a single visit"
                    >
                        <article className="flex h-full flex-col rounded-lg border border-border bg-card p-6 shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <span className="inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
                                        Secondary path
                                    </span>
                                    <h2 className="mt-4 text-2xl font-semibold tracking-tight">Single visit</h2>
                                </div>
                                <MessageSquareText className="h-7 w-7 text-emerald-700" aria-hidden="true" />
                            </div>

                            <p className="mt-4 text-lg font-semibold text-foreground">${SINGLE_VISIT_DOLLARS}/visit request</p>
                            <p className="mt-3 text-sm text-muted-foreground">
                                Use this path for one non-emergency issue when you are not ready for ongoing membership.
                            </p>

                            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                                {SINGLE_VISIT_POINTS.map((item) => (
                                    <li key={item} className="flex gap-2">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-auto pt-6">
                                <span className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition group-hover:bg-muted">
                                    Request a single visit
                                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </span>
                            </div>
                        </article>
                    </BookChoiceLink>
                </section>
            </div>
        </div>
    );
}

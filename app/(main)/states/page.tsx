import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SchemaBlocks } from "@/components/seo/SchemaBlocks";
import { getAllStates } from "@/lib/public-site";
import { absoluteUrl } from "@/lib/site-url";
import { US_STATES } from "@/lib/us-states";
import { buildStatesHubSchemas } from "@/lib/schema";

export const metadata: Metadata = {
    title: "States We Serve | Present Health",
    description: "Present Health is currently accepting patients in Michigan, with plans to expand to additional states. Virtual primary care with flat-fee membership pricing.",
    alternates: {
        canonical: absoluteUrl("/states"),
    },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Promise<{ waitlist?: string; waitlist_error?: string; state?: string }>;

function stateCodeForSlug(slug: string) {
    return US_STATES.find((s) => s.slug === slug)?.code ?? slug.slice(0, 2).toUpperCase();
}

export default async function StatesHubPage({ searchParams }: { searchParams: SearchParams }) {
    const allStates = await getAllStates();
    const states = allStates.filter((s) => s.isActive);
    const sp = await searchParams;
    const waitlistSuccess = sp?.waitlist === "1";
    const waitlistError = sp?.waitlist_error || "";
    const prefillStateSlug = typeof sp?.state === "string" ? sp.state : "";
    const prefillStateName = US_STATES.find((s) => s.slug === prefillStateSlug)?.name || "";
    const schemaBlocks = buildStatesHubSchemas();

    return (
        <div className="container px-4 md:px-6 mx-auto py-24">
            <SchemaBlocks blocks={schemaBlocks} idPrefix="states-hub" />

            <header className="max-w-3xl">
                <div className="inline-flex items-center gap-2">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Where We Serve</h1>
                </div>
                <p className="mt-4 text-lg text-muted-foreground">
                    Present Health is currently accepting patients in Michigan, with plans to expand to additional states.
                </p>

            </header>

            <section className="mt-12">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <h2 className="text-xl font-semibold tracking-tight">Browse Active States</h2>
                    <Badge variant="secondary">{states.length} active</Badge>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {states.map((state) => (
                    <Link key={state.id} href={`/states/${state.slug}`} className="group">
                        <Card className="border-border/60 hover:shadow-md transition-shadow h-full">
                            <CardHeader className="flex flex-row items-start justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                        {state.name}
                                    </CardTitle>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Virtual primary care with flat-fee membership pricing.
                                    </p>
                                </div>
                                <div className="shrink-0 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm font-semibold tracking-wide">
                                    {stateCodeForSlug(state.slug)}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="text-sm text-primary font-medium">View details</div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
            </section>

            {allStates.length ? (
                <section className="mt-12">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <h2 className="text-xl font-semibold tracking-tight">Availability Map (All States)</h2>
                        <p className="text-sm text-muted-foreground">Active states are highlighted.</p>
                    </div>

                    <div className="mt-6 grid gap-2 grid-cols-4 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-12">
                        {allStates.map((s) => {
                            const code = stateCodeForSlug(s.slug);
                            const isActive = Boolean(s.isActive);
                            const href = isActive ? `/states/${s.slug}` : `/states?state=${encodeURIComponent(s.slug)}#waitlist`;
                            return (
                                <Link
                                    key={s.id}
                                    href={href}
                                    className={[
                                        "rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors",
                                        isActive
                                            ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                                            : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/30",
                                    ].join(" ")}
                                    aria-label={isActive ? `Open ${s.name} state page` : `Join waitlist for ${s.name}`}
                                >
                                    <div className="text-sm font-semibold tracking-wide">{code}</div>
                                    <div className="mt-0.5 truncate">{s.name}</div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            ) : null}

            {states.length === 0 && (
                <div className="mt-12 rounded-2xl border border-border bg-muted/20 p-8 text-muted-foreground">
                    No active states are listed yet. Once state pages are seeded, they will appear here.
                </div>
            )}

            <section id="waitlist" className="mt-14">
                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle className="text-xl">Don&apos;t see your state? Join our waitlist.</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            We&apos;ll email you when Present Health becomes available where you live.
                        </p>
                    </CardHeader>
                    <CardContent>
                        {waitlistSuccess ? (
                            <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                                You&apos;re on the waitlist. We&apos;ll be in touch.
                            </div>
                        ) : null}
                        {waitlistError ? (
                            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                                {waitlistError === "invalid-email" ? "Please enter a valid email address." : "Something went wrong. Please try again."}
                            </div>
                        ) : null}

                        <form action="/api/waitlist" method="post" className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] items-end">
                            <div className="grid gap-2">
                                <Label htmlFor="waitlistEmail">Email</Label>
                                <Input id="waitlistEmail" name="email" type="email" required placeholder="you@example.com" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="waitlistState">State (optional)</Label>
                                <Input id="waitlistState" name="stateInterest" defaultValue={prefillStateName} placeholder="e.g., Michigan" />
                            </div>
                            {/* Honeypot for bots */}
                            <input name="hp" tabIndex={-1} autoComplete="off" className="hidden" />
                            <Button type="submit">Join waitlist</Button>
                        </form>

                        <p className="mt-4 text-xs text-muted-foreground">
                            Prefer to get started now? See <Link href="/pricing" className="text-primary hover:underline">pricing</Link>,{" "}
                            learn <Link href="/how-it-works" className="text-primary hover:underline">how it works</Link>, or browse{" "}
                            <Link href="/learn" className="text-primary hover:underline">learn</Link>.
                        </p>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}

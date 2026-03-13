import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SchemaBlocks } from "@/components/seo/SchemaBlocks";
import { Markdown } from "@/components/markdown";
import { getStateBySlug } from "@/lib/public-site";
import { absoluteUrl } from "@/lib/site-url";
import { buildCitySchemas, coerceFaqs } from "@/lib/schema";
import { getAllStateCityParams, getCitiesForState } from "@/lib/state-cities";
import { LICENSED_STATES } from "@/lib/schema";

export const runtime = "nodejs";
export const revalidate = 3600;

type CityPageParams = { stateSlug: string; citySlug: string } | Promise<{ stateSlug: string; citySlug: string }>;

export async function generateStaticParams() {
    return getAllStateCityParams();
}

function findCity(stateSlug: string, citySlug: string) {
    const cities = getCitiesForState(stateSlug);
    return cities.find((c) => c.slug === citySlug) ?? null;
}

function findStateName(stateSlug: string) {
    return LICENSED_STATES.find((s) => s.slug === stateSlug)?.name ?? null;
}

export async function generateMetadata({ params }: { params: CityPageParams }): Promise<Metadata> {
    const { stateSlug, citySlug } = await params;
    const city = findCity(stateSlug, citySlug);
    const stateName = findStateName(stateSlug);
    if (!city || !stateName) return {};

    return {
        title: `Direct Primary Care in ${city.name}, ${stateName} | Present Health`,
        description: `Get messaging-first primary care in ${city.name}, ${stateName}. Text your clinician, skip the wait. $99/month.`,
        alternates: {
            canonical: absoluteUrl(`/states/${stateSlug}/${citySlug}`),
        },
    };
}

export default async function CityPage({ params }: { params: CityPageParams }) {
    const { stateSlug, citySlug } = await params;
    const city = findCity(stateSlug, citySlug);
    const stateName = findStateName(stateSlug);
    if (!city || !stateName) notFound();

    const state = await getStateBySlug(stateSlug);
    if (!state || !state.isActive) notFound();

    const faqs = coerceFaqs(state.faqs);
    const schemaBlocks = buildCitySchemas({
        cityName: city.name,
        citySlug: city.slug,
        stateName,
        stateSlug,
        faqs,
    });

    const siblingCities = getCitiesForState(stateSlug).filter((c) => c.slug !== citySlug);

    const howItWorks = state.telehealthRegulationsSummary || "";
    const rx = state.rxLogistics || "";
    const labs = state.labOptions || "";
    const emergency = state.emergencyProtocol || "";

    return (
        <div className="container px-4 md:px-6 mx-auto py-24 max-w-6xl">
            <SchemaBlocks blocks={schemaBlocks} idPrefix={`city-${stateSlug}-${citySlug}`} />

            <header className="max-w-3xl">
                <nav className="mb-4 text-sm text-muted-foreground flex items-center gap-1.5">
                    <Link href="/" className="hover:underline">Home</Link>
                    <span>/</span>
                    <Link href="/states" className="hover:underline">States</Link>
                    <span>/</span>
                    <Link href={`/states/${stateSlug}`} className="hover:underline">{stateName}</Link>
                    <span>/</span>
                    <span className="text-foreground">{city.name}</span>
                </nav>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                    Telehealth Primary Care in {city.name}, {stateName}
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    Skip the waiting room. Present Health brings messaging-first primary care to {city.name} residents — same physician,
                    simple pricing, and virtual-first care built for busy schedules. $99/month, no insurance required.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                        <Link href="/pricing" className="hover:underline">See pricing</Link>
                    </Badge>
                    <Badge variant="secondary">
                        <Link href="/how-it-works" className="hover:underline">How it works</Link>
                    </Badge>
                    <Badge variant="secondary">
                        <Link href="/learn" className="hover:underline">Learn</Link>
                    </Badge>
                </div>
            </header>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px] items-start">
                <div className="grid gap-6">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-base">How It Works in {city.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                            <Markdown content={howItWorks || `We're finalizing state-specific details for ${stateName}. In the meantime, you can review our general workflow on /how-it-works.`} />
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-base">Prescriptions &amp; Pharmacy</CardTitle>
                        </CardHeader>
                        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                            <Markdown content={rx || `We're finalizing prescription logistics for ${stateName}. In general, we can send e-prescriptions to many local pharmacies in ${city.name} and discuss refill timing during your visit.`} />
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-base">Lab Work</CardTitle>
                        </CardHeader>
                        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                            <Markdown content={labs || `We're finalizing lab options for ${stateName}. If labs are needed, we'll help you choose a convenient draw site near ${city.name} and review results with you.`} />
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-base">In an Emergency</CardTitle>
                        </CardHeader>
                        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                            <Markdown content={emergency || "If you have emergency symptoms, call 911 or seek immediate in-person care. If you're unsure, err on the side of safety and get urgent help, then message us so we can coordinate follow-up."} />
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-base">Frequently Asked Questions</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            {faqs.length ? (
                                <Accordion type="single" collapsible className="w-full">
                                    {faqs.map((faq, idx) => (
                                        <AccordionItem key={idx} value={`faq-${idx}`}>
                                            <AccordionTrigger>{faq.question}</AccordionTrigger>
                                            <AccordionContent className="prose prose-sm max-w-none dark:prose-invert">
                                                <Markdown content={faq.answer} />
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            ) : (
                                <div>Coming soon.</div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <aside className="grid gap-4 lg:sticky lg:top-24">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-base">Pricing Reminder</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                                Membership starts at <span className="font-medium text-foreground">$99/month</span>. No insurance required.
                            </p>
                            <div className="mt-3">
                                <Link href="/pricing" className="text-primary hover:underline">View pricing</Link>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-base">Join Present Health in {city.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Button asChild className="w-full">
                                <Link href="/join">Join now</Link>
                            </Button>
                            <p className="mt-3 text-xs text-muted-foreground">
                                Not sure yet? Review <Link href="/how-it-works" className="text-primary hover:underline">how it works</Link>.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-base">
                                <Link href={`/states/${stateSlug}`} className="hover:underline">
                                    View all {stateName} details →
                                </Link>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            See state-specific telehealth regulations, prescriptions, labs, and FAQs for {stateName}.
                        </CardContent>
                    </Card>

                    {siblingCities.length > 0 && (
                        <Card className="border-border/60">
                            <CardHeader>
                                <CardTitle className="text-base">Nearby cities in {stateName}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                                <div className="flex flex-wrap gap-2">
                                    {siblingCities.map((c) => (
                                        <Badge key={c.slug} variant="secondary">
                                            <Link href={`/states/${stateSlug}/${c.slug}`} className="hover:underline">{c.name}</Link>
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </aside>
            </div>
        </div>
    );
}

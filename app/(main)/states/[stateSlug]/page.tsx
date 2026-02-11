import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SchemaBlocks } from "@/components/seo/SchemaBlocks";
import { Markdown } from "@/components/markdown";
import { prisma } from "@/lib/prisma";
import { getActiveStates, getStateBySlug } from "@/lib/public-site";
import { absoluteUrl } from "@/lib/site-url";
import { regionForStateCode } from "@/lib/us-regions";
import { stateCode as toStateCode } from "@/lib/us-states";
import { buildStateSchemas, coerceFaqs } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StateSlugParams = { stateSlug: string } | Promise<{ stateSlug: string }>;

export async function generateMetadata({ params }: { params: StateSlugParams }): Promise<Metadata> {
    const { stateSlug } = await params;
    const state = await getStateBySlug(stateSlug);
    if (!state || !state.isActive) return {};

    const title = state.metaTitle?.trim() || `Telehealth Direct Primary Care in ${state.name} | Present Health`;
    const description =
        state.metaDescription?.trim() ||
        `See the same family physician every visit. Present Health offers telehealth DPC memberships for ${state.name} residents. $99/month, no insurance needed.`;

    return {
        title,
        description,
        alternates: {
            canonical: absoluteUrl(`/states/${state.slug}`),
        },
    };
}

export default async function StatePage({ params }: { params: StateSlugParams }) {
    const { stateSlug } = await params;
    const state = await getStateBySlug(stateSlug);

    if (!state || !state.isActive) {
        notFound();
    }

    const faqs = coerceFaqs(state.faqs);
    const schemaBlocks = buildStateSchemas({
        name: state.name,
        slug: state.slug,
        faqs: state.faqs,
        telehealthRegulationsSummary: state.telehealthRegulationsSummary,
    });

    const stateCode = toStateCode(state.slug) || null;
    const physicians = stateCode
        ? await prisma.physician.findMany({
            where: { isActive: true, statesLicensed: { has: stateCode } },
            orderBy: { name: "asc" },
        })
        : [];

    const activeStates = await getActiveStates();
    const region = stateCode ? regionForStateCode(stateCode) : null;
    let alsoAvailable = region
        ? activeStates.filter((s) => s.slug !== state.slug && regionForStateCode(toStateCode(s.slug) || "") === region)
        : [];
    if (alsoAvailable.length < 6) {
        const fill = activeStates.filter((s) => s.slug !== state.slug && !alsoAvailable.some((x) => x.slug === s.slug));
        alsoAvailable = alsoAvailable.concat(fill);
    }
    alsoAvailable = alsoAvailable.slice(0, 6);

    const howItWorks = state.telehealthRegulationsSummary || "";
    const rx = state.rxLogistics || "";
    const labs = state.labOptions || "";
    const emergency = state.emergencyProtocol || "";
    const hsa = state.hsaNotes || "";

    return (
        <div className="container px-4 md:px-6 mx-auto py-24 max-w-6xl">
            <SchemaBlocks blocks={schemaBlocks} idPrefix={`state-${state.slug}`} />

            <header className="max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Telehealth Direct Primary Care in {state.name}</h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    Same physician, simple pricing, and virtual-first care built for busy schedules. Below are state-specific logistics for telehealth visits,
                    prescriptions, labs, and FAQs.
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
                            <CardTitle className="text-base">How It Works in {state.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                            <Markdown content={howItWorks || `We’re finalizing state-specific details for ${state.name}. In the meantime, you can review our general workflow on /how-it-works.`} />
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-base">Prescriptions &amp; Pharmacy</CardTitle>
                        </CardHeader>
                        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                            <Markdown content={rx || `We’re finalizing prescription logistics for ${state.name}. In general, we can send e-prescriptions to many local pharmacies and discuss refill timing during your visit.`} />
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-base">Lab Work</CardTitle>
                        </CardHeader>
                        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                            <Markdown content={labs || `We’re finalizing lab options for ${state.name}. If labs are needed, we’ll help you choose a convenient draw site and review results with you.`} />
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-base">In an Emergency</CardTitle>
                        </CardHeader>
                        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                            <Markdown content={emergency || "If you have emergency symptoms, call 911 or seek immediate in-person care. If you’re unsure, err on the side of safety and get urgent help, then message us so we can coordinate follow-up."} />
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-base">HSA &amp; Payment</CardTitle>
                        </CardHeader>
                        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                            <Markdown content={hsa || `We’re finalizing HSA/payment notes for ${state.name}. HSA eligibility can depend on plan details and IRS rules. Consult a tax professional for your situation.`} />
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
                            Membership starts at <span className="font-medium text-foreground">$99/month</span>. No insurance required.
                            <div className="mt-3">
                                <Link href="/pricing" className="text-primary hover:underline">View pricing</Link>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-base">Join Present Health in {state.name}</CardTitle>
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
                            <CardTitle className="text-base">Physicians Licensed in {state.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            {physicians.length ? (
                                <ul className="space-y-2">
                                    {physicians.map((p) => (
                                        <li key={p.id}>
                                            <Link href={`/our-physicians/${p.slug}`} className="text-foreground hover:text-primary hover:underline">
                                                {p.name}
                                            </Link>
                                            {p.credentials ? <span className="text-muted-foreground">{" "}({p.credentials})</span> : null}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div>Provider details for this state will appear here.</div>
                            )}
                        </CardContent>
                    </Card>

                    {alsoAvailable.length ? (
                        <Card className="border-border/60">
                            <CardHeader>
                                <CardTitle className="text-base">Also available in nearby states</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                                <div className="flex flex-wrap gap-2">
                                    {alsoAvailable.map((s) => (
                                        <Badge key={s.id} variant="secondary">
                                            <Link href={`/states/${s.slug}`} className="hover:underline">{s.name}</Link>
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}
                </aside>
            </div>
        </div>
    );
}

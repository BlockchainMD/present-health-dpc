import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployerInquiryForm } from "@/components/employers/EmployerInquiryForm";
import { EmployerRoiCalculator } from "@/components/employers/EmployerRoiCalculator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SchemaBlocks } from "@/components/seo/SchemaBlocks";
import { Markdown } from "@/components/markdown";
import { prisma } from "@/lib/prisma";
import { getEmployerFaqs } from "@/lib/employers";
import { absoluteUrl } from "@/lib/site-url";
import { buildForEmployersSchemas } from "@/lib/schema";

export const metadata: Metadata = {
    title: "For Employers | Present Health",
    description: "Employer and group membership options at $29 per employee per month.",
    alternates: {
        canonical: absoluteUrl("/for-employers"),
    },
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams =
    | {
          employees?: string | string[];
          premium?: string | string[];
          utilization?: string | string[];
          company?: string | string[];
      }
    | Promise<{
          employees?: string | string[];
          premium?: string | string[];
          utilization?: string | string[];
          company?: string | string[];
      }>;

function parseNumberParam(value: string | string[] | undefined, fallback: number, min: number, max: number) {
    const raw = Array.isArray(value) ? value[0] : value;
    const n = Number.parseFloat(String(raw || ""));
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

async function getTestimonials() {
    try {
        return await prisma.employerTestimonial.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        });
    } catch (error) {
        console.error("[for-employers] Failed to fetch testimonials", error);
        return [];
    }
}

export default async function ForEmployersPage({ searchParams }: { searchParams: SearchParams }) {
    const sp = await searchParams;
    const prefillEmployees = parseNumberParam(sp?.employees, 25, 5, 200);
    const prefillPremium = parseNumberParam(sp?.premium, 650, 0, 100000);
    const prefillUtilization = parseNumberParam(sp?.utilization, 2000, 0, 100000);
    const companyParam = Array.isArray(sp?.company) ? sp?.company[0] : sp?.company;
    const company = String(companyParam || "").trim();

    const [faqs, testimonials] = await Promise.all([getEmployerFaqs(), getTestimonials()]);
    const schemaBlocks = buildForEmployersSchemas(faqs);

    return (
        <div className="container px-4 md:px-6 mx-auto py-24 max-w-6xl">
            <SchemaBlocks blocks={schemaBlocks} idPrefix="for-employers" />

            <header className="max-w-3xl">
                <Badge variant="secondary">Employer benefit</Badge>
                <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">Give Your Team a Doctor - Not Just a Health Plan</h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    Present Health DPC memberships cost a fraction of group insurance and your employees get better care.
                    Starting at $29 per employee per month.
                </p>
                {company ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                        ROI preview is pre-filled for <span className="font-medium text-foreground">{company}</span>.
                    </p>
                ) : null}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <Button asChild size="lg">
                        <a href="#inquiry">Request details</a>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                        <Link href="/states">See state availability</Link>
                    </Button>
                </div>
            </header>

            <section className="mt-14">
                <div className="grid gap-6 lg:grid-cols-2 items-start">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>How It Works for Employers</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-4">
                            <ul className="space-y-2">
                                <li>Each employee gets messaging-first access to licensed clinicians</li>
                                <li>Same-day or next-day telehealth appointments</li>
                                <li>Unlimited visits, no copays, no surprise bills</li>
                                <li>
                                    Available in 15 states{" "}
                                    <Link href="/states" className="text-primary hover:underline">
                                        (see states)
                                    </Link>
                                </li>
                                <li>Simple monthly per-employee billing</li>
                            </ul>
                            <div className="pt-2 flex flex-wrap gap-2">
                                <Button asChild variant="outline">
                                    <Link href="/how-it-works">How telehealth DPC works</Link>
                                </Button>
                                <Button asChild variant="outline">
                                    <Link href="/pricing">Individual pricing</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <EmployerRoiCalculator
                        initialEmployees={prefillEmployees}
                        initialPremiumMonthly={prefillPremium}
                        initialUtilizationAnnual={prefillUtilization}
                    />
                </div>
            </section>

            <section className="mt-14">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <h2 className="text-2xl font-bold tracking-tight">Testimonials</h2>
                </div>

                {testimonials.length ? (
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                        {testimonials.map((t) => (
                            <Card key={t.id} className="border-border/60">
                                <CardHeader className="space-y-2">
                                    <CardTitle className="text-base">{t.companyName}</CardTitle>
                                    {t.logoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={t.logoUrl} alt={`${t.companyName} logo`} className="h-8 w-auto opacity-80" />
                                    ) : null}
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground space-y-3">
                                    <blockquote className="border-l-2 border-border pl-4 italic text-foreground">
                                        “{t.quote}”
                                    </blockquote>
                                    {t.personName ? (
                                        <div className="text-xs text-muted-foreground">
                                            {t.personName}
                                            {t.personTitle ? `, ${t.personTitle}` : ""}
                                        </div>
                                    ) : null}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="mt-6 rounded-2xl border border-border bg-muted/20 p-8 text-muted-foreground">
                        Join the growing number of businesses choosing DPC.
                    </div>
                )}
            </section>

            <section id="inquiry" className="mt-14">
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Talk to our team</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-3">
                            <p>
                                Tell us about your workforce (size, states, timeline). We&apos;ll follow up with next steps and employer enrollment details.
                            </p>
                            <div className="text-xs text-muted-foreground">
                                Typical response time: 1-2 business days.
                            </div>
                        </CardContent>
                    </Card>

                    <EmployerInquiryForm />
                </div>
            </section>

            <section className="mt-14">
                <h2 className="text-2xl font-bold tracking-tight">Employer FAQs</h2>
                <div className="mt-6">
                    <Card className="border-border/60">
                        <CardContent className="pt-6">
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
                                <div className="text-sm text-muted-foreground">No FAQs configured yet.</div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </section>

            <div className="mt-14 rounded-2xl border border-border bg-muted/20 p-8 text-center">
                <h2 className="text-2xl font-bold tracking-tight mb-3">Ready to offer DPC as a benefit?</h2>
                <p className="text-muted-foreground mb-6">Start with a quick inquiry and we&apos;ll send details tailored to your team.</p>
                <Button asChild size="lg">
                    <a href="#inquiry">Request details</a>
                </Button>
                <div className="mt-4 text-xs text-muted-foreground">
                    Last updated {format(new Date(), "MMM d, yyyy")}
                </div>
            </div>
        </div>
    );
}

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import Image from "next/image";

import { LPAnimations, FadeInWhenVisible, StickyMobileCTA } from './client';
import { Markdown } from '@/components/markdown';
import { normalizeMarkdownForRender } from '@/lib/markdown-utils';
import { getOrCreateAttributionSession } from '@/lib/attribution';
import { headers } from 'next/headers';

/**
 * Sanitizes content by removing markdown citation patterns like "([Present Health][1])"
 * These are often included by ChatGPT when generating content with source references
 */
function sanitizeContent(text: string): string {
    if (!text) return text;
    // Remove patterns like "([Present Health][1])" or "([text][number])"
    let next = text.replace(/\s*\(\[[^\]]+\]\[[^\]]+\]\)/g, '');
    next = next.replace(/book (a )?free intro (call|conversation)/gi, "start membership");
    next = next.replace(/book intro call/gi, "start membership");
    next = next.replace(/talk to dr\.?\s*j directly/gi, "Message our care team directly");
    next = next.replace(/direct messaging with dr\.?\s*j/gi, "Direct messaging with your care team");
    return next;
}

function sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
        return sanitizeContent(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const key of Object.keys(obj)) {
            result[key] = sanitizeObject(obj[key]);
        }
        return result;
    }
    return obj;
}

// Force dynamic rendering to ensure we get fresh data
export const dynamic = 'force-dynamic';

interface PageProps {
    params: { slug: string } | Promise<{ slug: string }>;
    searchParams: { [key: string]: string | string[] | undefined };
}

export async function generateMetadata({ params }: PageProps) {
    const { slug } = await params;
    const run = await prisma.campaignRun.findFirst({
        where: { campaign: { landingSlug: slug } },
        orderBy: { createdAt: 'desc' },
        select: { indexing: true }
    });

    const indexing = run?.indexing || 'NOINDEX';

    return {
        robots: {
            index: indexing === 'INDEX',
            follow: indexing === 'INDEX',
            nocache: true,
            googleBot: {
                index: indexing === 'INDEX',
                follow: indexing === 'INDEX',
            },
        },
    };
}

export default async function LandingPage({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const pick = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
    const { gclid, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = searchParams;
    const gclidValue = pick(gclid);
    const utmSource = pick(utm_source);
    const utmMedium = pick(utm_medium);
    const utmCampaign = pick(utm_campaign);
    const utmTerm = pick(utm_term);
    const utmContent = pick(utm_content);

    // Trigger Attribution Session
    const headerList = await headers();
    await getOrCreateAttributionSession(undefined, {
        gclid: gclidValue,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        landingPath: `/lp/${slug}`,
        referrer: headerList.get('referer') || undefined,
        userAgentHash: headerList.get('user-agent') || undefined, // Hashed in helper
    });

    const runId = (await prisma.campaign.findFirst({
        where: { landingSlug: slug },
        select: { runs: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true } } }
    }))?.runs[0]?.id;

    // 1. Find Campaign by landingSlug
    const campaign = await prisma.campaign.findFirst({
        where: { landingSlug: slug },
        include: {
            runs: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        }
    });
    if (!campaign || !campaign.runs[0]) {
        notFound();
    }

    const rawContent = campaign.runs[0].landingPageContent;
    let content: any = {};
    try {
        const parsed = JSON.parse(rawContent || '{}');
        content = sanitizeObject(parsed); // Remove markdown citation patterns
    } catch (e) {
        console.error("Failed to parse landing page content", e);
        notFound();
    }

    // Defensive defaults for rendering - also sanitize fallbacks from campaign table
    const sanitizedCampaignBenefits = (campaign.benefits || []).map(b => sanitizeContent(b));
    const sanitizedCampaignProofPoints = (campaign.proofPoints || []).map(p => sanitizeContent(p));
    content.benefits = (content.benefits && content.benefits.length > 0) ? content.benefits : sanitizedCampaignBenefits;
    content.proof = (content.proof && content.proof.length > 0) ? content.proof : sanitizedCampaignProofPoints;


    if (!content.howItWorks || !Array.isArray(content.howItWorks) || content.howItWorks.length === 0) {
        content.howItWorks = [
            { title: "Sign up", desc: "Start membership in minutes." },
            { title: "Message", desc: "Message your care team directly." },
            { title: "Get care", desc: "Get ongoing primary care with one transparent plan." }
        ];
    }

    content.faqs = content.faqs || [];

    // BULLETPROOF PRICING FALLBACK
    const defaultPricing = {
        headline: "Simple Monthly Membership",
        subheadline: "Direct access. Transparent pricing. No insurance required.",
        tiers: [
            {
                name: "Membership",
                price: 99,
                period: "mo",
                features: ["Unlimited virtual visits", "Direct messaging with your care team", "Care coordination", "Prevention planning"]
            }
        ]
    };

    if (!content.pricing || typeof content.pricing !== 'object' || !content.pricing.tiers || !Array.isArray(content.pricing.tiers) || content.pricing.tiers.length === 0) {
        content.pricing = defaultPricing;
    }

    const joinUrl = `/join?runId=${runId}${gclid ? `&gclid=${gclid}` : ''}`;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Image src="/logo-transparent.png" alt="Present Health" width={32} height={32} />
                        <span className="font-bold text-xl text-primary">Present Health</span>
                    </Link>
                    <Button asChild size="sm">
                        <Link href={joinUrl}>Start Membership - $99/mo</Link>
                    </Button>
                </div>
            </header>

            <main className="flex-1">
                <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>

                    {/* Hero */}
                    <LPAnimations>
                        <section className="relative pt-12 pb-20 md:pt-24 md:pb-32 overflow-hidden bg-background">
                            <div className="container mx-auto px-4 md:px-6 relative z-10">
                                <div className="grid lg:grid-cols-2 gap-12 items-center">
                                    <div className="text-center lg:text-left order-2 lg:order-1">
                                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                                            {content.hero.headline}
                                        </h1>
                                        <p className="text-xl text-muted-foreground mb-8 text-balance">
                                            {content.hero.subheadline}
                                        </p>
                                        <Button asChild size="lg" className="text-lg px-8 h-12">
                                            <Link href={joinUrl}>
                                                {content.hero.cta} <ArrowRight className="ml-2 h-5 w-5" />
                                            </Link>
                                        </Button>
                                        <p className="mt-4 text-sm text-muted-foreground">
                                            No insurance needed. Transparent pricing.
                                        </p>
                                    </div>

                                    {/* HERO VISUAL: LARGE PORTRAIT */}
                                    <div className="relative mx-auto w-full max-w-md order-1 lg:order-2">
                                        {/* Abstract Background Blob */}
                                        <div className="absolute -top-16 -right-16 w-80 h-80 bg-primary/10 rounded-full blur-3xl opacity-60" />
                                        <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl opacity-60" />

                                        {/* Portrait */}
                                        <div className="relative">
                                            <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border-2 border-border">
                                                <Image
                                                    src="/doctor-portrait.jpg"
                                                    alt="Present Health clinician team"
                                                    fill
                                                    className="object-cover"
                                                    priority
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                            </div>

                                            {/* Overlay Card */}
                                            <div className="absolute -bottom-6 -left-6 right-6 bg-background border border-border rounded-2xl p-4 shadow-xl">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-shrink-0">
                                                        <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                            <div className="h-3 w-3 bg-emerald-500 rounded-full animate-pulse" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-foreground">Present Health Team</p>
                                                        <p className="text-sm text-emerald-600 font-medium">Accepting New Members</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </LPAnimations>

                    {/* Educational Briefing (Medical Briefing) */}
                    {content.educationalBriefing && (
                        <FadeInWhenVisible>
                            <section className="py-20 bg-background border-y border-border">
                                <div className="container mx-auto px-4 max-w-4xl">
                                    <div className="prose prose-lg dark:prose-invert mx-auto prose-headings:font-bold prose-p:text-muted-foreground">
                                        <Markdown content={normalizeMarkdownForRender(content.educationalBriefing)} />
                                    </div>
                                </div>
                            </section>
                        </FadeInWhenVisible>
                    )}

                    {/* Benefits */}
                    <FadeInWhenVisible>
                        <section className="py-20 bg-background">
                            <div className="container mx-auto px-4 max-w-4xl">
                                <div className="grid md:grid-cols-2 gap-12 items-center">
                                    <div>
                                        <h2 className="text-3xl font-bold mb-6">Why Choose Present Health?</h2>
                                        <ul className="space-y-4">
                                            {content.benefits.map((benefit: string, i: number) => (
                                                <li key={i} className="flex items-start gap-3">
                                                    <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                                                    <span className="text-lg">{benefit}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-muted p-8 rounded-2xl">
                                        <h3 className="font-semibold mb-4 text-lg">Our Promise</h3>
                                        <ul className="space-y-3">
                                            {content.proof.map((point: string, i: number) => (
                                                <li key={i} className="flex items-center gap-2 text-muted-foreground">
                                                    <ShieldCheck className="h-5 w-5 text-primary" />
                                                    {point}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </FadeInWhenVisible>

                    {/* Pricing */}
                    {content.pricing && (
                        <FadeInWhenVisible>
                            <section className="py-20 bg-muted/30">
                                <div className="container mx-auto px-4 md:px-6">
                                    <div className="text-center max-w-3xl mx-auto mb-12">
                                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                                            {content.pricing.headline}
                                        </h2>
                                        <p className="text-muted-foreground">{content.pricing.subheadline}</p>
                                    </div>

                                    <div className="flex justify-center max-w-lg mx-auto">
                                        {content.pricing.tiers.map((tier: any, i: number) => (
                                            <Card key={i} className="h-full flex flex-col border-primary shadow-md w-full relative overflow-hidden">
                                                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                                                    MEMBERSHIP
                                                </div>
                                                <CardHeader>
                                                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                                                    <CardDescription>For one adult.</CardDescription>
                                                </CardHeader>
                                                <CardContent className="flex-1">
                                                    <div className="mb-6">
                                                        <span className="text-4xl font-bold">${tier.price}</span>
                                                        <span className="text-muted-foreground">/{tier.period}</span>
                                                    </div>
                                                    <ul className="space-y-3">
                                                        {tier.features.map((feature: string, j: number) => (
                                                            <li key={j} className="flex items-center gap-3 text-sm">
                                                                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                                                {feature}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </CardContent>
                                                <CardFooter className="mt-auto flex flex-col gap-4">
                                                    <Button className="w-full" asChild>
                                                        <Link href={joinUrl}>
                                                            Start Membership - $99/mo
                                                        </Link>
                                                    </Button>
                                                    <p className="text-xs text-center text-muted-foreground font-medium">Cancel Anytime</p>
                                                </CardFooter>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </FadeInWhenVisible>
                    )}

                    {/* FAQ Section */}
                    {content.faqs && content.faqs.length > 0 && (
                        <FadeInWhenVisible>
                            <section className="py-20 bg-background">
                                <div className="container mx-auto px-4 max-w-3xl">
                                    <h2 className="text-3xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
                                    <div className="space-y-6">
                                        {content.faqs.map((faq: any, i: number) => (
                                            <div key={i} className="border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
                                                <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
                                                <p className="text-muted-foreground">{faq.answer}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </FadeInWhenVisible>
                    )}

                    {/* How It Works */}
                    <FadeInWhenVisible>
                        <section className="py-20 bg-muted/30">
                            <div className="container mx-auto px-4 text-center">
                                <h2 className="text-3xl font-bold mb-12">How It Works</h2>
                                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                                    {content.howItWorks.map((step: any, i: number) => (
                                        <div key={i} className="bg-background p-6 rounded-xl shadow-sm border border-border">
                                            <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                                                {i + 1}
                                            </div>
                                            <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                                            <p className="text-muted-foreground">{step.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </FadeInWhenVisible>

                    {/* Final CTA */}
                    <FadeInWhenVisible>
                        <section className="py-20 bg-primary text-primary-foreground text-center">
                            <div className="container mx-auto px-4">
                                <h2 className="text-3xl font-bold mb-4">{content.ctaSection?.headline || "Ready to get started?"}</h2>
                                <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">{content.ctaSection?.subheadline || "Join Present Health today."}</p>
                                <Button asChild size="lg" variant="secondary" className="text-lg px-8">
                                    <Link href={joinUrl}>
                                        {content.ctaSection?.buttonText || "Start Membership - $99/mo"}
                                    </Link>
                                </Button>
                            </div>
                        </section>
                    </FadeInWhenVisible>

                    <StickyMobileCTA ctaText={content.hero.cta} runId={campaign.runs[0].id} />
                </Suspense>
            </main>

            {/* Footer */}
            <footer className="py-12 bg-background border-t border-border">
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    <p className="max-w-2xl mx-auto mb-4">
                        {content.disclaimer}
                    </p>
                    <p>&copy; {new Date().getFullYear()} Present Health. All rights reserved.</p>
                </div>
            </footer>
        </div >
    );
}

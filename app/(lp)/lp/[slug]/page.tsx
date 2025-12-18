import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import Image from "next/image";

// Force dynamic rendering to ensure we get fresh data
export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default async function LandingPage({ params }: PageProps) {
    const { slug } = await params;

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

    if (!campaign || !campaign.runs[0] || !campaign.runs[0].landingPageContent) {
        notFound();
    }

    const content = JSON.parse(campaign.runs[0].landingPageContent);

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="font-bold text-xl text-primary">Present Health</div>
                    <Button asChild size="sm">
                        <Link href="/book">Book Intro Call</Link>
                    </Button>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero */}
                {/* Hero */}
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
                                    <Link href="/book">
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
                                            alt="Dr. J - Your Physician at Present Health"
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
                                                <p className="font-bold text-foreground">Dr. J</p>
                                                <p className="text-sm text-emerald-600 font-medium">Accepting New Members</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Benefits */}
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

                {/* How It Works */}
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

                {/* Final CTA */}
                <section className="py-20 bg-primary text-primary-foreground text-center">
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl font-bold mb-6">Ready to get started?</h2>
                        <Button asChild size="lg" variant="secondary" className="text-lg px-8">
                            <Link href="/book">
                                Book Your Free Intro Call
                            </Link>
                        </Button>
                    </div>
                </section>
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
        </div>
    );
}

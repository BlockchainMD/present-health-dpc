import type { Metadata } from "next";
import Link from "next/link";
import {
    MessageSquare,
    MessageSquareText,
    Image as ImageIcon,
    Mic,
    Video,
    ShieldCheck,
    Paperclip,
    ArrowRight,
    CheckCircle2,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HeroBackgroundMedia } from "@/components/home/HeroBackgroundMedia";
import { SchemaBlocks } from "@/components/seo/SchemaBlocks";
import { buildHomepageSchemas } from "@/lib/schema";

export const metadata: Metadata = {
    title: "Text-First Primary Care | Present Health",
    description:
        "Text your care team and get a real answer. Full-service primary care for adults 18+ with messaging-first access and video when clinically appropriate.",
    openGraph: {
        title: "Text-First Primary Care | Present Health",
        description:
            "Text your care team and get a real answer. Full-service primary care for adults 18+ with messaging-first access and video when clinically appropriate.",
        url: "https://presenthealthmd.com",
        siteName: "Present Health",
        images: [
            {
                url: "https://presenthealthmd.com/og-image.png",
                width: 1200,
                height: 630,
                alt: "Present Health — Text-First Primary Care",
            },
        ],
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Text-First Primary Care | Present Health",
        description: "Text your care team and get a real answer. Primary care for adults 18+ — $99/month.",
        images: ["https://presenthealthmd.com/og-image.png"],
    },
};

type ScenarioCardProps = {
    title: string;
    patientMessage: string;
    patientAttachmentLabel: string;
    clinicianResponse: string;
};

type FeatureCardProps = {
    icon: React.ReactNode;
    title: string;
    description: string;
};

type FaqItemProps = {
    question: string;
    body: React.ReactNode;
};

const STATES = [
    "Arizona",
    "Florida",
    "Indiana",
    "Kentucky",
    "Michigan",
    "Minnesota",
    "North Carolina",
    "Nebraska",
    "New Hampshire",
    "Ohio",
    "Rhode Island",
    "Texas",
    "Utah",
    "Washington",
    "Wisconsin",
];

function ChannelIcons({ inverted = false }: { inverted?: boolean }) {
    const channels = [
        { label: "Text", icon: MessageSquareText, isPrimary: true },
        { label: "Photo", icon: ImageIcon, isPrimary: true },
        { label: "Voice", icon: Mic, isPrimary: true },
        { label: "Video", icon: Video, isPrimary: false },
    ] as const;

    return (
        <div className="flex flex-wrap items-center gap-4">
            {channels.map((channel) => {
                const Icon = channel.icon;
                return (
                    <div
                        key={channel.label}
                        className={`flex items-center gap-2 rounded-full px-4 py-2 ${inverted ? "border border-white/15 bg-white/10 backdrop-blur-sm" : "border border-border"}`}
                    >
                        <span
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${channel.isPrimary
                                ? inverted
                                    ? "bg-emerald-400/20 text-emerald-100"
                                    : "bg-primary/15 text-primary"
                                : inverted
                                    ? "bg-white/12 text-slate-100"
                                    : "bg-muted text-muted-foreground"
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                        </span>
                        <span className={`text-sm font-medium ${inverted ? "text-white" : "text-foreground"}`}>{channel.label}</span>
                    </div>
                );
            })}
        </div>
    );
}

function HeroSection() {
    return (
        <section className="relative isolate overflow-hidden bg-slate-950 pt-24 pb-20 text-white md:pt-28 md:pb-24">
            <HeroBackgroundMedia />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#f6f2ea]" />
            <div className="container relative z-10 mx-auto px-4 md:px-6">
                <div className="max-w-3xl py-10 md:py-14 lg:max-w-2xl">
                    <Badge className="mb-5 border border-white/12 bg-white/10 text-white hover:bg-white/10">
                        Accepting New Members
                    </Badge>
                    <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-white md:text-6xl">
                        Text your care team. Get a real answer.
                    </h1>
                    <p className="mt-5 max-w-2xl text-lg text-slate-200 md:text-xl">
                        Primary care that starts with a message and stays close when life gets complicated. Sick visits,
                        chronic care, prescriptions, labs, and follow-up for $99/month.
                    </p>
                    <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                        <Button asChild size="lg" className="h-12 bg-white px-8 text-base font-semibold text-slate-950 hover:bg-slate-100">
                            <Link href="/join">Start Membership - $99/mo</Link>
                        </Button>
                        <div className="rounded-full border border-white/14 bg-white/10 px-4 py-2 text-sm text-slate-100 backdrop-blur-sm">
                            No insurance needed. No per-visit fees. Cancel anytime.
                        </div>
                    </div>
                    <div className="mt-7 flex flex-wrap items-center gap-3 text-sm text-slate-100">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 backdrop-blur-sm">
                            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                            Board-certified physician-led care
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 backdrop-blur-sm">
                            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                            Licensed across {STATES.length} states
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 backdrop-blur-sm">
                            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                            Adults 18+ with fast digital access
                        </div>
                    </div>
                    <div className="mt-8">
                        <ChannelIcons inverted />
                    </div>
                </div>
            </div>
        </section>
    );
}

function ScenarioCard({ title, patientMessage, patientAttachmentLabel, clinicianResponse }: ScenarioCardProps) {
    return (
        <Card className="border-border/70 bg-card">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg leading-tight">{title}</CardTitle>
                <div className="mt-2 flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        Present Health Secure Message
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="rounded-lg bg-muted p-3 text-sm text-foreground">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Patient</div>
                    <p>{patientMessage}</p>
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
                        <Paperclip className="h-3 w-3" />
                        {patientAttachmentLabel}
                    </div>
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Clinician</div>
                    <p>{clinicianResponse}</p>
                </div>
                <p className="text-xs text-muted-foreground">Illustrative example. Not a real patient interaction.</p>
            </CardContent>
        </Card>
    );
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
    return (
        <Card className="flex flex-col items-center text-center p-6 bg-background border-border/70 shadow-sm">
            <div className="mb-4">{icon}</div>
            <CardTitle className="text-xl font-semibold mb-2">{title}</CardTitle>
            <CardDescription className="text-muted-foreground">{description}</CardDescription>
        </Card>
    );
}

function ScenarioSection() {
    const serviceSchema = {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "Present Health Membership",
        "description": "Full-service primary care for adults 18+ with messaging-first access and video when clinically appropriate.",
        "provider": {
            "@type": "MedicalBusiness",
            "name": "Present Health"
        },
        "offers": {
            "@type": "Offer",
            "priceCurrency": "USD",
            "price": "99.00",
            "url": "https://www.presenthealthmd.com/pricing"
        }
    };

    const hsaFAQ = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": "Can I use HSA/FSA funds for Present Health membership?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes. Direct Primary Care (DPC) memberships are HSA-eligible in 2026. The $99/month fee is within the $150/month limit for DPC. Please consult a tax professional for specific guidance regarding your individual situation."
                }
            }
        ]
    };

    return (
        <section id="features" className="w-full py-24 md:py-32 bg-slate-50 border-y border-border">
            <SchemaBlocks blocks={[serviceSchema, hsaFAQ]} idPrefix="homepage-mid" />
            <div className="container px-4 md:px-6 mx-auto max-w-6xl">
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold tracking-tight md:text-4xl text-foreground">Healthcare that respects your time</h2>
                    <p className="text-xl text-muted-foreground mt-4">
                        Everything you need from a primary care doctor, accessible from anywhere.
                    </p>
                </div>
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    <FeatureCard
                        icon={<MessageSquare className="h-6 w-6 text-emerald-700" />}
                        title="Text-First Approach"
                        description="Communicate with your dedicated care team via secure messaging, photos, and voice memos. Get answers quickly without waiting for appointments."
                    />
                    <FeatureCard
                        icon={<Video className="h-6 w-6 text-emerald-700" />}
                        title="Video Consults When Needed"
                        description="For more complex issues or when a visual assessment is helpful, seamlessly transition to a video call with your clinician."
                    />
                    <FeatureCard
                        icon={<ShieldCheck className="h-6 w-6 text-emerald-700" />}
                        title="Secure & Private"
                        description="Your health data is protected with bank-grade security and HIPAA compliance, ensuring your privacy at all times."
                    />
                </div>
                <div className="mx-auto mb-10 max-w-3xl text-center mt-16">
                    <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                        Healthcare questions don&apos;t wait. Neither should your clinician.
                    </h2>
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                    <ScenarioCard
                        title="The rash that doesn&apos;t need an office visit"
                        patientMessage="I&apos;ve had this rash on my forearm for 3 days. It&apos;s not itchy but it&apos;s spreading."
                        patientAttachmentLabel="Photo attached"
                        clinicianResponse="Thanks for the photo. Based on what I can see, start a thin layer of over-the-counter hydrocortisone twice daily and avoid fragranced soaps for now. If it spreads quickly, becomes painful, or you develop fever, message us right away so we can adjust your plan promptly."
                    />
                    <ScenarioCard
                        title="The lab results nobody explained"
                        patientMessage="Got my bloodwork back from my annual. What does 'elevated ALT' mean?"
                        patientAttachmentLabel="Document attached"
                        clinicianResponse="Good question. ALT is a liver enzyme, and a mild elevation can happen for several reasons, including medications, recent illness, or fatty liver patterns. In your context, let&apos;s repeat labs in a defined timeframe and review any risk factors together so you know exactly what to do next."
                    />
                    <ScenarioCard
                        title="The medication question between appointments"
                        patientMessage="My cardiologist added lisinopril. I&apos;m on metformin and atorvastatin. Should I worry about interactions?"
                        patientAttachmentLabel="Medication list attached"
                        clinicianResponse="That combination is commonly used together. One practical thing to monitor is blood pressure trends and kidney-related labs after the change. Keep taking as prescribed, log home readings, and message us if you notice dizziness, swelling, or other new symptoms so we can guide next steps."
                    />
                </div>
            </div>
        </section>
    );
}

function WhatWeHandleSection() {
    const acuteItems = [
        "UTIs and infections",
        "Rashes and skin concerns",
        "Cold, flu, and respiratory illness",
        "Allergies",
        "Minor injuries",
        "Eye and ear issues",
    ];

    const ongoingItems = [
        "Chronic condition management (diabetes, hypertension, thyroid, cholesterol)",
        "Medication management and refills",
        "Lab ordering and interpretation",
        "Annual wellness planning",
        "Specialist referrals and care coordination",
        "Mental health screening and medication",
    ];

    return (
        <section className="bg-background py-16 md:py-20">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mx-auto max-w-4xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Real primary care. Really.</h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                        We manage the same things your doctor&apos;s office does - just messaging-first. About 80-90% of typical
                        primary care needs can be handled without an in-person visit.
                    </p>
                </div>
                <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2">
                    <Card className="border-border/70">
                        <CardHeader>
                            <CardTitle>Acute Care</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                {acuteItems.map((item) => (
                                    <li key={item} className="flex items-start gap-2">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                    <Card className="border-border/70">
                        <CardHeader>
                            <CardTitle>Ongoing Care</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                {ongoingItems.map((item) => (
                                    <li key={item} className="flex items-start gap-2">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
                <p className="mx-auto mt-8 max-w-4xl text-center text-sm text-muted-foreground">
                    When you need hands-on care - a physical exam, a procedure, imaging - we&apos;ll tell you and help you find the
                    right provider near you.
                </p>
            </div>
        </section>
    );
}

function HowItWorksSection() {
    const steps = [
        {
            title: "Sign up in 5 minutes",
            description: "One plan, $99/month, quick health intake.",
        },
        {
            title: "Welcome call",
            description:
                "After signup, you&apos;ll have a brief video welcome call with your clinician so they know your history and goals. All care is overseen by a board-certified physician.",
        },
        {
            title: "Start messaging",
            description: "Secure text, photos, voice memos. Anytime.",
        },
        {
            title: "Get real care",
            description: "Prescriptions, lab orders, chronic care, referrals - handled in the same conversation.",
        },
    ];

    return (
        <section className="bg-muted/20 py-16 md:py-20">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mx-auto mb-10 max-w-3xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight md:text-4xl">How it works</h2>
                </div>
                <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
                    {steps.map((step, idx) => (
                        <Card key={step.title} className="border-border/70">
                            <CardHeader>
                                <CardDescription className="text-primary">Step {idx + 1}</CardDescription>
                                <CardTitle className="text-xl">{step.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">{step.description}</CardContent>
                        </Card>
                    ))}
                </div>
                <p className="mx-auto mt-6 max-w-4xl text-center text-sm text-muted-foreground">
                    Step 2 happens after signup to personalize care. It does not block your ability to start messaging.
                </p>
            </div>
        </section>
    );
}

function PricingBlockSection() {
    return (
        <section id="pricing" className="w-full py-24 md:py-32">
            <div className="container px-4 md:px-6 mx-auto max-w-6xl">
                <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
                    <div className="space-y-2 max-w-3xl">
                        <div className="inline-block rounded-lg bg-emerald-100 px-3 py-1 text-sm text-emerald-800 font-medium mb-2">Pricing</div>
                        <h2 className="text-3xl font-bold tracking-tight md:text-5xl text-foreground">Simple, transparent pricing</h2>
                        <p className="text-xl text-muted-foreground mt-4">
                            No co-pays, no deductibles, no hidden fees. Just great care.
                        </p>
                    </div>
                </div>

                <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto items-start">
                    {/* Monthly Plan */}
                    <Card className="flex flex-col h-full border-border/60 shadow-sm transition-all hover:shadow-md relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-emerald-700 text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                            Most Popular
                        </div>
                        <CardHeader className="pt-8 pb-4">
                            <CardTitle className="text-3xl md:text-4xl">$99/month. Everything included.</CardTitle>
                            <p className="text-muted-foreground pt-2">Billed monthly. Cancel anytime.</p>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-4 text-center">
                            <p className="text-sm text-muted-foreground">
                                HSA-eligible in 2026
                                <br />
                                <span className="text-xs">Subject to IRS rules. Consult a tax professional.</span>
                            </p>
                            <div>
                                <Button asChild size="lg" className="h-12 px-8 text-base">
                                    <Link href="/join">Start Membership</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Annual Plan */}
                    <Card className="flex flex-col h-full border-border/60 shadow-sm transition-all hover:shadow-md">
                        <CardHeader className="pb-8 pt-8 border-b border-border/40">
                            <CardTitle className="text-3xl md:text-4xl">$990/year — save $198</CardTitle>
                            <p className="text-muted-foreground pt-2">Billed annually.</p>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-4 text-center">
                            <p className="text-sm text-muted-foreground">
                                HSA-eligible in 2026
                                <br />
                                <span className="text-xs">Subject to IRS rules. Consult a tax professional.</span>
                            </p>
                            <div>
                                <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base">
                                    <Link href="/join">Choose Annual Plan</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    );
}

function HowWeDifferSection() {
    const points = [
        {
            title: "No per-visit fees.",
            body: "Most telehealth charges you every time you need help. We don&apos;t. Message us 5 times or 50 - still $99.",
        },
        {
            title: "No insurance billing.",
            body: "No copays, no surprise bills, no claims to file. One transparent price.",
        },
        {
            title: "No tiers or upsells.",
            body: "Everything is included. You never find out the thing you need costs extra.",
        },
    ];

    return (
        <section className="bg-muted/20 py-16 md:py-20">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mx-auto mb-10 max-w-3xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight md:text-4xl">How we&apos;re different</h2>
                </div>
                <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
                    {points.map((point) => (
                        <Card key={point.title} className="border-border/70 bg-card">
                            <CardHeader>
                                <CardTitle className="text-xl">{point.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">{point.body}</CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}

function TrustSection() {
    return (
        <section className="bg-background py-16 md:py-20">
            <div className="container mx-auto px-4 md:px-6">
                <Card className="mx-auto max-w-4xl border-border/70">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl md:text-4xl">Primary care built for access.</CardTitle>
                        <CardDescription className="mx-auto max-w-3xl text-base text-muted-foreground">
                            Present Health delivers real primary care through secure messaging and video when needed. Care is
                            delivered by licensed clinicians and overseen by a board-certified physician.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Button asChild variant="outline" className="h-11 px-6">
                            <Link href="/physician">Meet Our Physician</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}

function FaqItem({ question, body }: FaqItemProps) {
    return (
        <AccordionItem value={question}>
            <AccordionTrigger className="text-lg font-medium text-foreground hover:no-underline">{question}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-base">{body}</AccordionContent>
        </AccordionItem>
    );
}

function FAQSection() {
    return (
        <section className="bg-slate-50 py-24 border-t border-border">
            <div className="container px-4 md:px-6 mx-auto max-w-4xl">
                <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
                <Accordion type="single" collapsible className="w-full rounded-xl border border-border bg-background px-4 md:px-6">
                    <FaqItem
                        question="Is this real primary care?"
                        body="Yes. Same scope as a traditional PCP - sick visits, chronic care, medications, labs, wellness planning. Delivered messaging-first with video when needed. About 80-90% of primary care doesn't require a physical exam."
                    />
                    <FaqItem
                        question="How fast will I get a response?"
                        body="Within 4 hours during business hours (M-F 8am-8pm ET). After-hours messages get a next-business-morning response."
                    />
                    <FaqItem
                        question="Do you take insurance?"
                        body="No, we operate outside the insurance system. This allows us to offer transparent pricing and spend more time directly on your care instead of paperwork. You can (and should) keep insurance for emergencies, specialists, and hospitalizations."
                    />
                    <FaqItem
                        question="Are there per-visit fees?"
                        body="Most telehealth charges you every time you need help. We don't. Message us 5 times or 50 - still $99."
                    />
                    <FaqItem
                        question="Can I use HSA/FSA funds?"
                        body={
                            <>
                                Yes. DPC memberships are HSA-eligible in 2026. $99/month is within the $150/month limit. Consult a tax
                                professional for specific guidance.
                            </>
                        }
                    />
                    <FaqItem
                        question="What if I need an in-person exam?"
                        body="If a physical exam or procedure is medically necessary (like a pap smear or stitches), we will advise you to seek local care (urgent care, ER, or an in-person specialist) and help coordinate the plan before and after your visit."
                    />
                    <FaqItem
                        question="What if I don't want a membership?"
                        body={
                            <>
                                We offer a single visit option for $99. See details on <Link href="/visit" className="text-primary hover:underline">/visit</Link>.
                            </>
                        }
                    />
                    <FaqItem
                        question="What states are you in?"
                        body={
                            <>
                                {STATES.join(", ")}. See full availability on the <Link href="/states" className="text-primary hover:underline">states page</Link>.
                            </>
                        }
                    />
                    <FaqItem
                        question="Do I have to be 18?"
                        body="Yes. Present Health serves adults 18 and older."
                    />
                </Accordion>
            </div>
        </section>
    );
}

function FinalCTASection() {
    return (
        <section className="bg-primary py-16 text-primary-foreground md:py-20">
            <div className="container px-4 md:px-6 mx-auto max-w-4xl text-center">
                <h2 className="text-3xl font-bold tracking-tight md:text-5xl mb-6 text-foreground">Ready to upgrade your primary care?</h2>
                <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                    Join Present Health today and experience healthcare that revolves around you.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Button size="lg" className="h-14 px-8 text-lg bg-emerald-700 hover:bg-emerald-800" asChild>
                        <Link href="/join">
                            Start Membership — $99/mo <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
                <p className="mt-4 text-sm text-primary-foreground/80">
                    Limited spots. We keep our practice small so every member gets real attention.
                </p>
            </div>
        </section>
    );
}

export default function HomePage() {
    const schemaBlocks = buildHomepageSchemas();

    return (
        <>
            <SchemaBlocks blocks={schemaBlocks} idPrefix="home" />
            <HeroSection />
            <ScenarioSection />
            <WhatWeHandleSection />
            <HowItWorksSection />
            <PricingBlockSection />
            <HowWeDifferSection />
            <TrustSection />
            <FAQSection />
            <FinalCTASection />
        </>
    );
}

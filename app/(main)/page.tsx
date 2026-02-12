import type { Metadata } from "next";
import Link from "next/link";
import {
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
import { SchemaBlocks } from "@/components/seo/SchemaBlocks";
import { buildHomepageSchemas } from "@/lib/schema";

export const metadata: Metadata = {
    title: "Text-First Primary Care | Present Health",
    description:
        "Text your care team and get a real answer. Full-service primary care for adults 18+ with messaging-first access and video when clinically appropriate.",
};

type ScenarioCardProps = {
    title: string;
    patientMessage: string;
    patientAttachmentLabel: string;
    clinicianResponse: string;
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

function ChannelIcons() {
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
                    <div key={channel.label} className="flex items-center gap-2 rounded-full border border-border px-4 py-2">
                        <span
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
                                channel.isPrimary ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-medium text-foreground">{channel.label}</span>
                    </div>
                );
            })}
        </div>
    );
}

function HeroSection() {
    return (
        <section className="relative overflow-hidden bg-background pt-24 pb-16 md:pt-28 md:pb-20">
            <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-primary/10 to-transparent" />
            <div className="container relative mx-auto px-4 md:px-6">
                <div className="mx-auto max-w-4xl text-center">
                    <Badge className="mb-5 bg-emerald-600 text-white hover:bg-emerald-600">Accepting New Members</Badge>
                    <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-6xl">
                        Text your care team. Get a real answer.
                    </h1>
                    <p className="mx-auto mt-5 max-w-3xl text-lg text-muted-foreground md:text-xl">
                        Full-service primary care, starting with a message. Sick visits, chronic care, prescriptions, labs,
                        and more — $49/month. Everything included.
                    </p>
                    <div className="mt-8">
                        <Button asChild size="lg" className="h-12 px-8 text-base">
                            <Link href="/join">Start Membership — $49/mo</Link>
                        </Button>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                        No insurance needed · No per-visit fees · Cancel anytime · Adults 18+
                    </p>
                    <div className="mt-8 flex justify-center">
                        <ChannelIcons />
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

function ScenarioSection() {
    return (
        <section className="bg-muted/20 py-16 md:py-20">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mx-auto mb-10 max-w-3xl text-center">
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
            description: "One plan, $49/month, quick health intake.",
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
        <section className="bg-background py-16 md:py-20">
            <div className="container mx-auto px-4 md:px-6">
                <Card className="mx-auto max-w-3xl border-primary/30 bg-primary/5">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl md:text-4xl">$49/month. Everything included.</CardTitle>
                        <CardDescription className="text-base text-muted-foreground">
                            No tiers. No per-visit fees. No upsells.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-center">
                        <p className="text-lg font-semibold text-foreground">$490/year — save $98</p>
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
            </div>
        </section>
    );
}

function HowWeDifferSection() {
    const points = [
        {
            title: "No per-visit fees.",
            body: "Most telehealth charges you every time you need help. We don&apos;t. Message us 5 times or 50 - still $49.",
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

function FAQSection() {
    return (
        <section className="bg-muted/20 py-16 md:py-20">
            <div className="container mx-auto max-w-4xl px-4 md:px-6">
                <h2 className="mb-10 text-center text-3xl font-bold tracking-tight md:text-4xl">Frequently asked questions</h2>
                <Accordion type="single" collapsible className="w-full rounded-xl border border-border bg-background px-4 md:px-6">
                    <AccordionItem value="faq-1">
                        <AccordionTrigger>Is this real primary care?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            Yes. Same scope as a traditional PCP - sick visits, chronic care, medications, labs, wellness planning.
                            Delivered messaging-first with video when needed. About 80-90% of primary care doesn&apos;t require a
                            physical exam.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="faq-2">
                        <AccordionTrigger>How fast will I get a response?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            Within 4 hours during business hours (M-F 8am-8pm ET). After-hours messages get a
                            next-business-morning response.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="faq-3">
                        <AccordionTrigger>What about things that need in-person care?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            We&apos;ll tell you and help you find the right local provider. We&apos;re transparent about what telehealth can
                            and can&apos;t do.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="faq-4">
                        <AccordionTrigger>Do I still need insurance?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            We&apos;re not insurance. But we handle day-to-day primary care. Many members rely on traditional office
                            visits much less.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="faq-5">
                        <AccordionTrigger>Can I use my HSA?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            Yes. DPC memberships are HSA-eligible in 2026. $49/month is within the $150/month limit. Consult a tax
                            professional.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="faq-6">
                        <AccordionTrigger>What states are you in?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            {STATES.join(", ")}. See full availability on the <Link href="/states" className="text-primary hover:underline">states page</Link>.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="faq-7">
                        <AccordionTrigger>Do I have to be 18?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            Yes. Present Health serves adults 18 and older.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="faq-8">
                        <AccordionTrigger>What if I just need one visit?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            We offer a single visit option for $49. See details on <Link href="/visit" className="text-primary hover:underline">/visit</Link>.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </section>
    );
}

function FinalCTASection() {
    return (
        <section className="bg-primary py-16 text-primary-foreground md:py-20">
            <div className="container mx-auto px-4 text-center md:px-6">
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Primary care that actually works.</h2>
                <div className="mt-7">
                        <Button asChild size="lg" variant="secondary" className="h-12 px-8 text-base">
                            <Link href="/join">
                            Start Membership — $49/mo <ArrowRight className="ml-2 h-4 w-4" />
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

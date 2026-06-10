import type { Metadata } from "next";
import Link from "next/link";
import {
    Heart,
    Activity,
    Pill,
    CheckCircle2,
    ArrowRight,
    Clock,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HeroBackgroundMedia } from "@/components/home/HeroBackgroundMedia";
import { SchemaBlocks } from "@/components/seo/SchemaBlocks";
import { buildHomepageSchemas } from "@/lib/schema";

export const metadata: Metadata = {
    title: "Heart-Health Prevention Membership — $99/mo | Present Health",
    description:
        "Know your heart risk — then actually lower it. A board-certified physician tracks your ApoB, blood pressure, and coronary calcium score and manages them down. $99/month, no insurance needed, HSA-eligible.",
    openGraph: {
        title: "Heart-Health Prevention Membership — $99/mo | Present Health",
        description:
            "Know your heart risk — then actually lower it. A board-certified physician tracks your ApoB, blood pressure, and coronary calcium score and manages them down. $99/month, no insurance needed, HSA-eligible.",
        url: "https://presenthealthmd.com",
        siteName: "Present Health",
        images: [
            {
                url: "https://presenthealthmd.com/og-image.png",
                width: 1200,
                height: 630,
                alt: "Present Health — Cardiovascular Prevention Membership",
            },
        ],
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Heart-Health Prevention Membership — $99/mo | Present Health",
        description: "Physician-led cardiovascular prevention. $99/month, no insurance needed, HSA-eligible.",
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

type ConditionCardProps = {
    slug: string;
    name: string;
    description: string;
};

const CONDITIONS: ConditionCardProps[] = [
    {
        slug: "blood-pressure",
        name: "Blood Pressure Management",
        description: "Regular monitoring and medication management for hypertension.",
    },
    {
        slug: "diabetes",
        name: "Diabetes & A1C Management",
        description: "Comprehensive diabetes and prediabetes care with lab tracking.",
    },
    {
        slug: "weight-management",
        name: "Weight Management",
        description: "Evidence-based weight management including GLP-1 support.",
    },
    {
        slug: "thyroid",
        name: "Thyroid Management",
        description: "Thyroid condition monitoring and medication optimization.",
    },
    {
        slug: "cholesterol",
        name: "Cholesterol & Heart Health",
        description: "Cardiovascular risk assessment and cholesterol management.",
    },
    {
        slug: "general-primary-care",
        name: "General Primary Care",
        description: "Full-spectrum primary care for acute and chronic conditions.",
    },
];

function HeroSection() {
    return (
        <section className="relative isolate overflow-hidden bg-slate-950 pt-24 pb-20 text-white md:pt-28 md:pb-24">
            <HeroBackgroundMedia />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#f6f2ea]" />
            <div className="container relative z-10 mx-auto px-4 md:px-6">
                <div className="max-w-3xl py-10 md:py-14 lg:max-w-2xl">
                    <Badge className="mb-5 border border-white/12 bg-white/10 text-white hover:bg-white/10">
                        Founding memberships — Michigan
                    </Badge>
                    <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-white md:text-6xl">
                        Know your heart risk. Then actually lower it.
                    </h1>
                    <p className="mt-5 max-w-2xl text-lg text-slate-200 md:text-xl">
                        A board-certified physician tracks your ApoB, blood pressure, and coronary calcium score — and works with you to bring them down. $99/month. No insurance needed. HSA-eligible.
                    </p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Button asChild size="lg" className="h-12 px-8 text-base font-semibold text-slate-950 hover:bg-slate-100">
                            <Link href="/join">Reserve your founding spot</Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base font-semibold text-slate-950 border-white hover:bg-white/10">
                            <Link href="/how-it-works">How it works</Link>
                        </Button>
                    </div>
                    <div className="mt-7 flex flex-wrap items-center gap-3 text-sm text-slate-100">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 backdrop-blur-sm">
                            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                            Board-certified physician-led
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 backdrop-blur-sm">
                            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                            Same-week appointments
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 backdrop-blur-sm">
                            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                            Insurance accepted
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ConditionCard({ slug, name, description }: ConditionCardProps) {
    return (
        <Link href={`/conditions/${slug}`}>
            <Card className="flex flex-col h-full border-border/70 bg-card hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                    <CardTitle className="text-lg">{name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground">{description}</p>
                </CardContent>
                <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-primary text-sm font-medium">
                        Learn more
                        <ArrowRight className="h-4 w-4" />
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

function ConditionsSection() {
    return (
        <section className="w-full py-24 md:py-32 bg-background">
            <div className="container px-4 md:px-6 mx-auto max-w-6xl">
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold tracking-tight md:text-4xl text-foreground">Conditions we treat</h2>
                    <p className="text-xl text-muted-foreground mt-4">
                        Comprehensive chronic disease management and primary care through video visits.
                    </p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {CONDITIONS.map((condition) => (
                        <ConditionCard
                            key={condition.slug}
                            slug={condition.slug}
                            name={condition.name}
                            description={condition.description}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

function HowItWorksSection() {
    const steps = [
        {
            number: "1",
            title: "Join in minutes",
            description: "$99/month, cancel anytime. No insurance, no surprise bills, HSA-eligible.",
        },
        {
            number: "2",
            title: "Baseline your numbers",
            description: "ApoB, lipids, and blood pressure — plus guidance on getting a coronary calcium scan locally (often around $120, cash).",
        },
        {
            number: "3",
            title: "Build your plan with your physician",
            description: "A video visit with a board-certified physician turns your numbers into a concrete risk-reduction plan.",
        },
        {
            number: "4",
            title: "Manage them down",
            description: "Ongoing messaging, prescriptions when appropriate, re-tests on a schedule — so you can watch your numbers trend the right way.",
        },
    ];

    return (
        <section className="bg-slate-50 py-24 md:py-32 border-y border-border">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mx-auto mb-16 max-w-3xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight md:text-4xl">How it works</h2>
                    <p className="text-lg text-muted-foreground mt-4">
                        Simple, straightforward process from booking to ongoing care.
                    </p>
                </div>
                <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-4">
                    {steps.map((step) => (
                        <div key={step.number} className="flex flex-col">
                            <div className="mb-4">
                                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white font-bold text-lg">
                                    {step.number}
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                            <p className="text-muted-foreground text-sm">{step.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function DifferentiatorSection() {
    const points = [
        {
            title: "We accept your insurance",
            description: "We work with most major commercial insurance plans. Your cost is your normal copay.",
        },
        {
            title: "Same-week appointments",
            description: "Book and be seen within the same week. No long waits for healthcare.",
        },
        {
            title: "One doctor who knows you",
            description: "Continuity of care with a physician who understands your health history.",
        },
        {
            title: "Real primary care, virtually",
            description: "Full-spectrum primary care — same scope as traditional office-based practice.",
        },
    ];

    return (
        <section className="bg-background py-24 md:py-32">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mx-auto mb-16 max-w-3xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight md:text-4xl">What makes us different</h2>
                </div>
                <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
                    {points.map((point) => (
                        <Card key={point.title} className="border-border/70 bg-card">
                            <CardHeader>
                                <CardTitle className="text-xl">{point.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-muted-foreground">{point.description}</CardContent>
                        </Card>
                    ))}
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
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="rounded-lg bg-muted p-3 text-sm text-foreground">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Patient</div>
                    <p>{patientMessage}</p>
                    {patientAttachmentLabel && (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
                            {patientAttachmentLabel}
                        </div>
                    )}
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Doctor</div>
                    <p>{clinicianResponse}</p>
                </div>
                <p className="text-xs text-muted-foreground">Illustrative example. Not a real patient interaction.</p>
            </CardContent>
        </Card>
    );
}

function ScenarioExamplesSection() {
    return (
        <section className="w-full py-24 md:py-32 bg-slate-50 border-y border-border">
            <div className="container px-4 md:px-6 mx-auto max-w-6xl">
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold tracking-tight md:text-4xl text-foreground">Real care, real examples</h2>
                    <p className="text-xl text-muted-foreground mt-4">
                        Here's how virtual primary care works in practice.
                    </p>
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                    <ScenarioCard
                        title="Managing blood pressure follow-up"
                        patientMessage="Just checked my BP at home - 148/92. Higher than last week."
                        patientAttachmentLabel="Photo of reading attached"
                        clinicianResponse="Good catch. Let's review your current meds and home log. Based on the trend, we may need to adjust. I'm sending you a requisition for labs. Book a quick follow-up video call with me in a few days after we have the results."
                    />
                    <ScenarioCard
                        title="Weight management support"
                        patientMessage="Started GLP-1 last month. How's the weight loss timing? When do we check in on side effects?"
                        patientAttachmentLabel=""
                        clinicianResponse="Great question. Most see changes around week 4-6. Side effects typically improve within 2-3 weeks. Let's schedule a video visit next week to assess how you're tolerating it and adjust the dose if needed."
                    />
                    <ScenarioCard
                        title="Acute illness evaluation"
                        patientMessage="Fever, sore throat, fatigue for 2 days. Temp peaked at 101.5F this morning."
                        patientAttachmentLabel=""
                        clinicianResponse="Let's get you a rapid strep test at an urgent care near you and send antibiotics after results. In the meantime, rest, fluids, and OTC fever management. Message me tomorrow with the test result and how you're feeling."
                    />
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
                        <CardTitle className="text-3xl md:text-4xl">Trusted, physician-led care</CardTitle>
                        <CardDescription className="mx-auto max-w-3xl text-base text-muted-foreground mt-2">
                            All care is delivered by licensed clinicians and overseen by board-certified physicians. We focus on evidence-based management of chronic conditions and primary care through convenient video visits.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Button asChild variant="outline" className="h-11 px-6">
                            <Link href="/our-physicians">Meet Our Physician</Link>
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
                        question="Do you take insurance?"
                        body="No — and that's by design. Present Health is a flat $99/month membership, so there are no copays, no claims, and no surprise bills. Qualifying memberships are HSA-eligible, and we help you get cash-rate pricing on labs and imaging."
                    />
                    <FaqItem
                        question="How does booking work?"
                        body="You can book online through our website. We offer same-week appointments. During scheduling, we'll verify your insurance coverage so there are no surprises."
                    />
                    <FaqItem
                        question="What conditions do you treat?"
                        body="We provide comprehensive primary care for chronic disease management (blood pressure, diabetes, thyroid, cholesterol, weight management) and acute illnesses. See our conditions page for the full list."
                    />
                    <FaqItem
                        question="How quickly can I be seen?"
                        body="Most patients can book and be seen within the same week. During your visit, we can address urgent issues, prescribe medications, order labs, and arrange follow-up care."
                    />
                    <FaqItem
                        question="Is this a substitute for emergency care?"
                        body="No. Present Health provides primary care for non-emergency conditions. For emergencies, please call 911 or go to your nearest emergency room."
                    />
                    <FaqItem
                        question="Can I get prescriptions and labs?"
                        body="Yes. During or after your visit, we can prescribe medications and order labs as clinically appropriate. Lab costs are billed separately at transparent prices."
                    />
                    <FaqItem
                        question="What if I need a physical exam?"
                        body="Some conditions require an in-person physical exam or procedure. If medically necessary, we'll advise you to seek local care and help coordinate your plan before and after."
                    />
                    <FaqItem
                        question="What states do you serve?"
                        body="We're currently accepting patients in Michigan, with plans to expand to additional states. Check our states page for the latest availability."
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
                <h2 className="text-3xl font-bold tracking-tight md:text-5xl mb-6 text-white">Ready to get started?</h2>
                <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
                    Book a visit this week and experience primary care that works with your insurance.
                </p>
                <Button size="lg" className="h-14 px-8 text-lg bg-white text-slate-950 hover:bg-slate-100 font-semibold" asChild>
                    <Link href="/book">
                        Book a Visit <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
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
            <ConditionsSection />
            <HowItWorksSection />
            <DifferentiatorSection />
            <ScenarioExamplesSection />
            <TrustSection />
            <FAQSection />
            <FinalCTASection />
        </>
    );
}

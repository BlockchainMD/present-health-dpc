"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Check, CheckCircle, MessageCircle, Clock, Shield, Heart, Phone, ArrowRight, X, ShieldCheck, CheckCircle2, Video, PhoneCall } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

// ============================================================================
// HERO V2 - Split Device Mockup (Video Call + Text)
// ============================================================================
function HeroV2Split() {
    return (
        <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden bg-background">
            <div className="container mx-auto px-4 md:px-6 relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="text-center lg:text-left">
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
                            Healthcare that <br className="hidden md:block" />
                            <span className="text-primary">actually works for you.</span>
                        </h1>
                        <p className="text-xl text-muted-foreground mb-6 max-w-2xl mx-auto lg:mx-0">
                            Text for quick questions. Video for deeper discussions. Phone when you prefer a voice. Your doctor, your choice.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                            <Button asChild size="lg" className="text-lg px-8 h-12 bg-primary text-primary-foreground hover:bg-primary/90">
                                <Link href="/pricing">
                                    <Phone className="mr-2 h-5 w-5" />
                                    Book a Free Intro Call
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="text-lg px-8 h-12">
                                <Link href="#pricing">
                                    See Pricing
                                </Link>
                            </Button>
                        </div>

                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-8">
                            <Link href="#hsa-info" className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-100 hover:bg-emerald-100 transition-colors">
                                <ShieldCheck className="w-4 h-4 mr-2" />
                                HSA/FSA Compatible (Starting 2026)*
                            </Link>
                            <span className="text-sm text-muted-foreground">Available in <strong>select states</strong>.</span>
                        </div>

                        {/* TRUST CHIPS */}
                        <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm text-muted-foreground">
                                <Shield className="h-4 w-4 text-primary" />
                                <span>Secure, HIPAA-conscious</span>
                            </div>
                            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm text-muted-foreground">
                                <Check className="h-4 w-4 text-primary" />
                                <span>No contracts</span>
                            </div>
                        </div>
                    </div>

                    {/* HERO VISUAL: SPLIT DEVICE MOCKUP */}
                    <div className="relative mx-auto w-full max-w-lg">
                        {/* Abstract Background Blob */}
                        <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl opacity-50 animate-pulse" />
                        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl opacity-50" />

                        <div className="relative flex gap-4 items-end justify-center">
                            {/* Laptop - Video Call */}
                            <div className="relative bg-slate-800 rounded-t-xl rounded-b-sm shadow-2xl w-56 md:w-64 overflow-hidden">
                                <div className="bg-slate-700 h-3 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-slate-500 rounded-full" />
                                </div>
                                <div className="aspect-[4/3] bg-slate-900 relative overflow-hidden">
                                    {/* Video call UI */}
                                    <div className="absolute inset-2 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex flex-col items-center justify-center">
                                        <div className="relative">
                                            <Image
                                                src="/doctor-portrait.jpg"
                                                alt="Dr. J on video call"
                                                width={80}
                                                height={80}
                                                className="rounded-full object-cover border-4 border-primary/20"
                                            />
                                            <div className="absolute bottom-0 right-0 h-4 w-4 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                                        </div>
                                        <p className="text-white text-xs mt-2 font-medium">Dr. J</p>
                                        <p className="text-white/60 text-[10px]">Video Call</p>
                                        <div className="flex gap-2 mt-3">
                                            <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center">
                                                <PhoneCall className="h-3 w-3 text-white" />
                                            </div>
                                            <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center">
                                                <Video className="h-3 w-3 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Small self-view */}
                                    <div className="absolute bottom-2 right-2 w-12 h-9 bg-slate-700 rounded-md border border-slate-600" />
                                </div>
                                <div className="bg-slate-700 h-2 rounded-b-sm" />
                            </div>

                            {/* Phone - Text Chat */}
                            <div className="relative bg-slate-800 rounded-[24px] shadow-2xl w-32 md:w-36 overflow-hidden border-4 border-slate-700">
                                <div className="bg-slate-700 h-4 flex items-center justify-center">
                                    <div className="w-8 h-1 bg-slate-500 rounded-full" />
                                </div>
                                <div className="bg-background h-48 md:h-56 p-2 space-y-2">
                                    {/* Header */}
                                    <div className="flex items-center gap-1 p-1 border-b border-border pb-2">
                                        <div className="h-5 w-5 rounded-full overflow-hidden">
                                            <Image src="/doctor-portrait.jpg" alt="Dr. J" width={20} height={20} className="object-cover" />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-semibold">Dr. J</p>
                                            <p className="text-[6px] text-emerald-500">Online</p>
                                        </div>
                                    </div>
                                    {/* Messages */}
                                    <div className="space-y-1">
                                        <div className="flex justify-end">
                                            <div className="bg-primary text-primary-foreground rounded-lg px-2 py-1 text-[7px] max-w-[80%]">
                                                Quick question about my meds
                                            </div>
                                        </div>
                                        <div className="flex justify-start">
                                            <div className="bg-muted text-foreground rounded-lg px-2 py-1 text-[7px] max-w-[80%]">
                                                Of course! What's up?
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-700 h-3 rounded-b-[20px]" />
                            </div>
                        </div>

                        {/* Caption */}
                        <p className="text-center text-sm text-muted-foreground mt-6 font-medium">
                            Video, text, or phone—reach your doctor however works best.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ============================================================================
// EXPECTATIONS SECTION
// ============================================================================
function ExpectationsSection() {
    const items = [
        {
            title: "Direct access to your doctor",
            body: "Message directly for quick questions, refills, and plan tweaks—no call centers or phone trees."
        },
        {
            title: "Same- or next-day telehealth (most issues)",
            body: "Fast access is the point. Membership is capped so you can actually be seen when you need it."
        },
        {
            title: "Clear plan + follow-through",
            body: "Visits end with next steps. We coordinate labs, imaging, referrals, and prevention—so nothing falls through the cracks."
        }
    ];

    return (
        <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4 md:px-6">
                <h2 className="text-2xl font-semibold text-center text-foreground mb-8">What you can expect</h2>
                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {items.map((item, i) => (
                        <Card key={i} className="border-border/50 shadow-sm bg-background">
                            <CardContent className="p-6">
                                <h3 className="font-semibold text-foreground mb-3 text-lg">{item.title}</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">{item.body}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============================================================================
// COMPARISON TABLE
// ============================================================================
function ComparisonSection() {
    return (
        <section className="py-20 bg-background">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                        Primary care is broken. We fixed it.
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Stop waiting weeks for a 7-minute visit. Get the care you deserve.
                    </p>
                </div>

                <div className="max-w-4xl mx-auto overflow-hidden rounded-xl border border-border shadow-sm">
                    <div className="grid grid-cols-3 bg-muted/50 p-4 font-semibold text-sm md:text-base">
                        <div className="text-muted-foreground">Feature</div>
                        <div className="text-center text-muted-foreground">Traditional Primary Care</div>
                        <div className="text-center text-primary font-bold">Present Health</div>
                    </div>

                    <div className="divide-y divide-border">
                        {[
                            { feature: "Wait Time", old: "20+ days average", new: "Same or Next Day" },
                            { feature: "Visit Length", old: "7-10 minutes rushed", new: "30-60 minutes relaxed" },
                            { feature: "Communication", old: "Portal (3-day delay)", new: "Text, Video, or Phone" },
                            { feature: "Cost", old: "Copays + Surprise Bills", new: "Flat Monthly Fee" },
                            { feature: "Relationship", old: "Transactional", new: "Personal & Continuous" },
                        ].map((row, i) => (
                            <div key={i} className="grid grid-cols-3 p-4 items-center text-sm md:text-base bg-background hover:bg-muted/5 transition-colors">
                                <div className="font-medium text-foreground">{row.feature}</div>
                                <div className="text-center text-muted-foreground">{row.old}</div>
                                <div className="text-center font-bold text-primary flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 hidden sm:block" />
                                    {row.new}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

// ============================================================================
// 4-UP SUMMARY GRID
// ============================================================================
function SummaryGrid() {
    const items = [
        { icon: MessageCircle, title: "Direct Messaging", desc: "Text your doctor directly. Get answers, not phone trees." },
        { icon: Clock, title: "Same- or Next-Day Telehealth", desc: "Sick today? Get seen quickly by text/video/phone." },
        { icon: Heart, title: "Preventive Care", desc: "Annual wellness plans tailored to your goals." },
        { icon: Shield, title: "Transparent Pricing", desc: "When you need labs or prescriptions, we help find fair self-pay options." }
    ];

    return (
        <section className="py-16 bg-background">
            <div className="container mx-auto px-4 md:px-6">
                <h2 className="text-2xl font-semibold text-center text-foreground mb-8">Everything You Need, Nothing You Don't</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                    {items.map((item, i) => (
                        <Card key={i} className="border-border/50 shadow-sm bg-background text-center">
                            <CardContent className="p-6">
                                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-4">
                                    <item.icon className="h-6 w-6" />
                                </div>
                                <h3 className="font-semibold text-foreground mb-2 text-sm">{item.title}</h3>
                                <p className="text-xs text-muted-foreground">{item.desc}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============================================================================
// HSA INFO
// ============================================================================
function HsaInfoV2() {
    return (
        <section id="hsa-info" className="py-20 bg-emerald-50/50 border-y border-emerald-100">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-emerald-950">
                        In 2026, Direct Primary Care becomes HSA-compatible.*
                    </h2>
                    <p className="text-lg text-emerald-800/80">
                        Starting <strong>Jan 1, 2026</strong>, eligible individuals may use <strong>HSA funds tax-free to pay DPC fees</strong>, subject to IRS rules and monthly limits.
                    </p>
                    <p className="text-sm text-emerald-800/80 mt-2">
                        For 2026, the monthly limit is <strong>$150 (individual)</strong> / <strong>$300 (family)</strong>.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 items-start max-w-5xl mx-auto">
                    <Card className="border-emerald-200 bg-white/80 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl text-emerald-900">How it works</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">1</div>
                                <p className="text-sm text-emerald-900/80">Choose an HSA-eligible plan.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">2</div>
                                <p className="text-sm text-emerald-900/80">Join Present Health ($149 Individual / $299 Family).</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">3</div>
                                <p className="text-sm text-emerald-900/80">Pay with your HSA card or reimburse yourself.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="bg-emerald-100/50 p-6 rounded-xl border border-emerald-200">
                        <h3 className="font-semibold text-emerald-900 mb-3">Note on labs + prescriptions</h3>
                        <p className="text-sm text-emerald-800/80 leading-relaxed">
                            The membership fee covers primary care services. <strong>Prescriptions</strong> and <strong>lab services</strong> are handled separately at transparent prices when needed.
                        </p>
                    </div>
                </div>
                <p className="text-center text-xs text-emerald-800/60 mt-8 max-w-2xl mx-auto">
                    *This is not tax advice. Consult a tax professional.
                </p>
            </div>
        </section>
    );
}

// ============================================================================
// PRICING CARDS
// ============================================================================
function PricingCardsV2() {
    const [isAnnual, setIsAnnual] = useState(false);

    return (
        <section id="pricing" className="py-20 bg-background">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                        Simple membership. Transparent pricing. Cancel anytime.
                    </h2>

                    <div className="flex items-center justify-center gap-4 mt-8">
                        <Label htmlFor="annual-mode" className={!isAnnual ? "font-bold" : "text-muted-foreground"}>Monthly</Label>
                        <Switch id="annual-mode" checked={isAnnual} onCheckedChange={setIsAnnual} />
                        <Label htmlFor="annual-mode" className={isAnnual ? "font-bold" : "text-muted-foreground"}>
                            Annual <span className="text-xs text-primary font-normal">(Save 1 month)</span>
                        </Label>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <Card className="flex flex-col border-border shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-2xl">Individual</CardTitle>
                            <CardDescription>For the solo health optimizer.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="mb-6">
                                <span className="text-4xl font-bold">${isAnnual ? 1639 : 149}</span>
                                <span className="text-muted-foreground">/{isAnnual ? 'yr' : 'mo'}</span>
                            </div>
                            <ul className="space-y-3">
                                {["Unlimited virtual visits", "Direct messaging", "Care coordination", "Annual prevention plan"].map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-sm">
                                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4">
                            <Button className="w-full" asChild>
                                <Link href={`/register?plan=individual&billing=${isAnnual ? 'annual' : 'monthly'}`}>
                                    Get Started
                                </Link>
                            </Button>
                            <p className="text-xs text-center text-muted-foreground font-medium">Cancel Anytime</p>
                        </CardFooter>
                    </Card>

                    <Card className="flex flex-col border-primary shadow-md relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                            BEST VALUE
                        </div>
                        <CardHeader>
                            <CardTitle className="text-2xl">Family</CardTitle>
                            <CardDescription>Up to 5 family members.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="mb-6">
                                <span className="text-4xl font-bold">${isAnnual ? 3289 : 299}</span>
                                <span className="text-muted-foreground">/{isAnnual ? 'yr' : 'mo'}</span>
                            </div>
                            <ul className="space-y-3">
                                {["Unlimited virtual visits for all", "Pediatric triage", "Family prevention strategy", "Coordination"].map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-sm">
                                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4">
                            <Button className="w-full" variant="default" asChild>
                                <Link href={`/register?plan=family&billing=${isAnnual ? 'annual' : 'monthly'}`}>
                                    Get Started
                                </Link>
                            </Button>
                            <p className="text-xs text-center text-muted-foreground font-medium">Cancel Anytime</p>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </section>
    );
}

// ============================================================================
// TRANSPARENCY
// ============================================================================
function TransparencyV2() {
    return (
        <section className="py-20 bg-background border-t border-border">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
                    <div>
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-primary">
                            <Check className="h-6 w-6" /> Included
                        </h3>
                        <ul className="space-y-3">
                            {["Sick visits", "Rashes", "UTIs", "Refills", "Chronic care", "Prevention planning", "Referrals"].map((item) => (
                                <li key={item} className="flex items-center gap-3 text-muted-foreground">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-muted-foreground">
                            <X className="h-6 w-6" /> Not Included
                        </h3>
                        <ul className="space-y-3">
                            {["Emergency care (call 911)", "Hospital bills", "Most labs/imaging (billed separately)"].map((item) => (
                                <li key={item} className="flex items-center gap-3 text-muted-foreground">
                                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ============================================================================
// FAQ
// ============================================================================
function FAQAccordionV2() {
    const faqs = [
        { question: "Do I still need insurance?", answer: "Yes—keep insurance for emergencies and specialists. DPC is a membership for primary care." },
        { question: "Can I use my HSA?", answer: "Starting Jan 1, 2026, eligible individuals may use HSA funds for DPC fees. Consult a tax professional." },
        { question: "Why is enrollment limited?", answer: "To protect your access. We cap membership so you can always reach your doctor." },
        { question: "What states are available?", answer: "We're in select states and expanding. Check during signup or book a free intro call." }
    ];

    return (
        <section className="py-20 bg-muted/30">
            <div className="container mx-auto px-4 md:px-6 max-w-3xl">
                <h2 className="text-3xl font-bold tracking-tight mb-12 text-center">Frequently Asked Questions</h2>
                <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                        <AccordionItem key={index} value={`item-${index}`}>
                            <AccordionTrigger className="text-left font-medium text-lg">{faq.question}</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground leading-relaxed">{faq.answer}</AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    );
}

// ============================================================================
// FINAL CTA
// ============================================================================
function FinalCTA() {
    return (
        <section className="py-20 bg-primary text-primary-foreground">
            <div className="container mx-auto px-4 md:px-6 text-center">
                <h2 className="text-3xl font-bold mb-4">Ready for a doctor who knows your name?</h2>
                <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
                    Limited membership to protect access.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg" variant="secondary" className="text-lg px-8 h-12">
                        <Link href="/register?plan=individual">
                            Join Now – $149/mo
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="text-lg px-8 h-12 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                        <Link href="/pricing">
                            <Phone className="mr-2 h-5 w-5" />
                            Book a Free Intro Call
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}

// ============================================================================
// STICKY CTA
// ============================================================================
function StickyCTA() {
    const [showSticky, setShowSticky] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 500 && !dismissed) setShowSticky(true);
            else setShowSticky(false);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [dismissed]);

    return (
        <AnimatePresence>
            {showSticky && (
                <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
                    <div className="flex items-center gap-2 bg-background border border-border shadow-lg rounded-full px-2 py-2">
                        <Link href="/register?plan=individual">
                            <Button size="sm" className="rounded-full px-6 bg-primary text-primary-foreground hover:bg-primary/90">
                                Join – $149/mo <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                        <button onClick={() => setDismissed(true)} className="p-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Dismiss">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ============================================================================
// MAIN V2 PAGE
// ============================================================================
export default function V2Page() {
    return (
        <>
            <HeroV2Split />
            <ExpectationsSection />
            <ComparisonSection />
            <SummaryGrid />
            <HsaInfoV2 />
            <PricingCardsV2 />
            <TransparencyV2 />
            <FAQAccordionV2 />
            <FinalCTA />
            <StickyCTA />
        </>
    );
}

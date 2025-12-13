"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, CheckCircle, MessageCircle, Clock, Shield, Heart, Star, Phone, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

// Import existing components
import { SocialProof } from "@/components/sections/SocialProof";
import { WhyPresentHealth } from "@/components/sections/WhyPresentHealth";
import { WhatYouGet } from "@/components/sections/WhatYouGet";
import { HsaInfo } from "@/components/sections/HsaInfo";
import { PricingCards } from "@/components/sections/PricingCards";
import { Transparency } from "@/components/sections/Transparency";
import { FAQAccordion } from "@/components/sections/FAQAccordion";

// ============================================================================
// HERO V2 - Upgraded CTA cluster + Trust Chips (Recommendations #1 & #2)
// ============================================================================
function HeroV2() {
    return (
        <section className="relative pt-20 pb-32 overflow-hidden bg-background">
            <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
                        Virtual Primary Care — <br className="hidden md:block" />
                        <span className="text-primary">with a real doctor, not a call center.</span>
                    </h1>
                    <p className="text-xl text-muted-foreground mb-2 max-w-2xl mx-auto">
                        Text your doctor. Same- or next-day visits. Clear plans and follow-through.
                    </p>
                    <p className="text-sm font-medium text-emerald-600 mb-8 bg-emerald-50 inline-block px-3 py-1 rounded-full border border-emerald-100">
                        Starting 2026: Pay your membership with HSA funds.*
                    </p>

                    {/* UPGRADED CTA CLUSTER - Recommendation #1 */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
                        <Button asChild size="lg" className="text-lg px-8 h-12 bg-primary text-primary-foreground hover:bg-primary/90">
                            <Link href="/register?plan=individual">
                                Join Now – $129/mo
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="text-lg px-8 h-12">
                            <Link href="/pricing">
                                <Phone className="mr-2 h-5 w-5" />
                                Book a Free Intro Call
                            </Link>
                        </Button>
                    </div>

                    {/* Text link for HSA info - keeps informational vibe */}
                    <p className="text-sm text-muted-foreground mb-8">
                        <Link href="/#hsa-info" className="underline hover:text-primary transition-colors">
                            How does HSA work with DPC? →
                        </Link>
                    </p>

                    {/* TRUST CHIPS - Recommendation #2 */}
                    <div className="flex flex-wrap justify-center gap-3 mb-8">
                        <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm text-muted-foreground">
                            <Shield className="h-4 w-4 text-primary" />
                            <span>HIPAA Compliant</span>
                        </div>
                        <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm text-muted-foreground">
                            <Check className="h-4 w-4 text-primary" />
                            <span>No contracts</span>
                        </div>
                        <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm text-muted-foreground">
                            <Check className="h-4 w-4 text-primary" />
                            <span>Cancel anytime</span>
                        </div>
                    </div>

                    {/* Original trust indicators */}
                    <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground font-medium">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-primary" />
                            <span>Board-Certified Family Medicine</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-primary" />
                            <span>Solo Practice</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-primary" />
                            <span>Limited membership to protect access</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ============================================================================
// TESTIMONIALS STRIP - Recommendation #3
// ============================================================================
function TestimonialsStrip() {
    const testimonials = [
        {
            quote: "I texted my doctor at 7am about a rash. By 8am, I had a prescription at my pharmacy. This is how healthcare should work.",
            name: "Sarah M.",
            role: "Member since 2024",
            stars: 5
        },
        {
            quote: "After years of 15-minute appointments where I felt rushed, having a doctor who actually listens is life-changing.",
            name: "David K.",
            role: "Family Plan Member",
            stars: 5
        },
        {
            quote: "The HSA compatibility sealed the deal. I'm paying with pre-tax dollars for better care. No-brainer.",
            name: "Jennifer L.",
            role: "Member since 2024",
            stars: 5
        }
    ];

    return (
        <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4 md:px-6">
                <h2 className="text-2xl font-semibold text-center text-foreground mb-8">What Our Members Say</h2>
                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {testimonials.map((testimonial, i) => (
                        <Card key={i} className="border-border/50 shadow-sm bg-background">
                            <CardContent className="p-6">
                                <div className="flex gap-1 mb-3">
                                    {Array.from({ length: testimonial.stars }).map((_, j) => (
                                        <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                                    ))}
                                </div>
                                <p className="text-muted-foreground mb-4 text-sm italic">"{testimonial.quote}"</p>
                                <div>
                                    <p className="font-medium text-foreground text-sm">{testimonial.name}</p>
                                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============================================================================
// 4-UP SUMMARY GRID - Recommendation #5
// ============================================================================
function SummaryGrid() {
    const items = [
        { icon: MessageCircle, title: "Direct Messaging", desc: "Text your doctor directly. Get answers, not phone trees." },
        { icon: Clock, title: "Same- or Next-Day Visits", desc: "Sick today? Get seen quickly. Virtually or in-person." },
        { icon: Heart, title: "Preventive Care", desc: "Annual wellness plans tailored to your goals." },
        { icon: Shield, title: "Transparent Pricing", desc: "Labs and meds at wholesale cost. No hidden fees." }
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
// FINAL CTA BAND - Recommendation #6
// ============================================================================
function FinalCTA() {
    return (
        <section className="py-20 bg-primary text-primary-foreground">
            <div className="container mx-auto px-4 md:px-6 text-center">
                <h2 className="text-3xl font-bold mb-4">Ready for a doctor who knows your name?</h2>
                <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
                    Limited membership to protect access. We cap enrollment so every member gets the attention they deserve.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg" variant="secondary" className="text-lg px-8 h-12">
                        <Link href="/register?plan=individual">
                            Join Now – $129/mo
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
// STICKY CTA - Recommendation #7
// ============================================================================
function StickyCTA() {
    const [showSticky, setShowSticky] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            // Show after scrolling past 500px
            if (window.scrollY > 500 && !dismissed) {
                setShowSticky(true);
            } else {
                setShowSticky(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [dismissed]);

    return (
        <AnimatePresence>
            {showSticky && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
                >
                    <div className="flex items-center gap-2 bg-background border border-border shadow-lg rounded-full px-2 py-2">
                        <Link href="/register?plan=individual">
                            <Button size="sm" className="rounded-full px-6 bg-primary text-primary-foreground hover:bg-primary/90">
                                Join – $129/mo
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                        <button
                            onClick={() => setDismissed(true)}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Dismiss"
                        >
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
export default function HomeV2() {
    return (
        <>
            {/* 1. Upgraded Hero with Trust Chips */}
            <HeroV2 />

            {/* 2. Testimonials Strip (before the narrative) */}
            <TestimonialsStrip />

            {/* 3. 4-Up Summary Grid (skim layer) */}
            <SummaryGrid />

            {/* 4. Original narrative sections (SocialProof renamed to avoid confusion) */}
            <SocialProof />
            <WhyPresentHealth />
            <WhatYouGet />
            <HsaInfo />
            <PricingCards />
            <Transparency />
            <FAQAccordion />

            {/* 5. Final CTA Band */}
            <FinalCTA />

            {/* 6. Sticky CTA (appears after scroll) */}
            <StickyCTA />
        </>
    );
}

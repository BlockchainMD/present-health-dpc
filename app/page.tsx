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
// HERO - OPTIMIZED (V3 Base + V1 Access Icons)
// ============================================================================
function HeroOptimized() {
  return (
    <section className="relative pt-12 pb-20 md:pt-24 md:pb-32 overflow-hidden bg-background">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left order-2 lg:order-1">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
              Your doctor should <br className="hidden md:block" />
              <span className="text-primary">know your name.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-6 max-w-xl mx-auto lg:mx-0">
              Direct access to your physician. Same- or next-day appointments. One flat monthly fee.
            </p>

            {/* ACCESS MODE ICONS (from V1) */}
            <div className="flex justify-center lg:justify-start gap-6 mb-8">
              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Text</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Video</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <PhoneCall className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Phone</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <Button asChild size="lg" className="text-lg px-8 h-14 bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/book">
                  <Phone className="mr-2 h-5 w-5" />
                  Book a Free Intro Call
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 h-14">
                <Link href="#pricing">
                  See Pricing
                </Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span>Board-Certified Physician</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span>10+ Years Experience</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span>No Contracts</span>
              </div>
            </div>
          </div>

          {/* HERO VISUAL: LARGE PORTRAIT (from V3) */}
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
  );
}

// ============================================================================
// FOUNDER QUOTE SECTION (from V3)
// ============================================================================
function FounderQuote() {
  return (
    <section className="py-16 bg-muted/30 border-y border-border">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <blockquote className="text-2xl md:text-3xl font-medium text-foreground leading-relaxed mb-6">
            "I left the traditional system because I was tired of spending more time on paperwork than with patients. Present Health is my way of practicing medicine the way it should be—focused on you."
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-full overflow-hidden">
              <Image src="/doctor-portrait.jpg" alt="Dr. J" width={48} height={48} className="object-cover" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">Dr. J</p>
              <p className="text-sm text-muted-foreground">Founder, Present Health</p>
            </div>
          </div>
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
    { icon: MessageCircle, title: "Text Your Doctor", desc: "Quick questions, refills, follow-ups—no phone trees." },
    { icon: Clock, title: "Same-Day Access", desc: "Sick today? Get seen today. No more 3-week waits." },
    { icon: Heart, title: "Prevention Focus", desc: "Annual wellness plans tailored to your goals." },
    { icon: Shield, title: "Fair Pricing", desc: "Transparent costs for labs and prescriptions when needed." }
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-2xl font-semibold text-center text-foreground mb-8">What You Get</h2>
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
function HsaInfoSection() {
  return (
    <section id="hsa-info" className="py-20 bg-emerald-50/50 border-y border-emerald-100">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-emerald-950">
            HSA-Compatible in 2026*
          </h2>
          <p className="text-lg text-emerald-800/80">
            Starting <strong>Jan 1, 2026</strong>, eligible individuals may use HSA funds to pay DPC fees tax-free, subject to IRS rules and limits.
          </p>
          <p className="text-sm text-emerald-800/80 mt-2">
            Monthly limit: <strong>$150 (individual)</strong> / <strong>$300 (family)</strong>.
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
                <p className="text-sm text-emerald-900/80">Choose an HSA-eligible health plan.</p>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">2</div>
                <p className="text-sm text-emerald-900/80">Join Present Health ($149 / $299 per month).</p>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">3</div>
                <p className="text-sm text-emerald-900/80">Pay with your HSA card or reimburse yourself.</p>
              </div>
            </CardContent>
          </Card>

          <div className="bg-emerald-100/50 p-6 rounded-xl border border-emerald-200">
            <h3 className="font-semibold text-emerald-900 mb-3">Labs + Prescriptions</h3>
            <p className="text-sm text-emerald-800/80 leading-relaxed">
              Membership covers primary care services. Labs and prescriptions are billed separately at transparent prices when needed.
            </p>
          </div>
        </div>
        <p className="text-center text-xs text-emerald-800/60 mt-8 max-w-2xl mx-auto">
          *Not tax advice. Consult a tax professional for your situation.
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// PRICING CARDS
// ============================================================================
function PricingCards() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Simple Membership
          </h2>
          <p className="text-muted-foreground">No insurance billing. Cancel anytime.</p>

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
              <CardDescription>For one adult.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="mb-6">
                <span className="text-4xl font-bold">${isAnnual ? 1639 : 149}</span>
                <span className="text-muted-foreground">/{isAnnual ? 'yr' : 'mo'}</span>
              </div>
              <ul className="space-y-3">
                {["Unlimited virtual visits", "Direct messaging", "Care coordination", "Prevention planning"].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <p className="text-xs text-center text-muted-foreground">Available in select states.</p>
              <Button className="w-full" asChild>
                <Link href="/book">
                  Book Free Intro Call
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
              <CardDescription>Up to 5 members.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="mb-6">
                <span className="text-4xl font-bold">${isAnnual ? 3289 : 299}</span>
                <span className="text-muted-foreground">/{isAnnual ? 'yr' : 'mo'}</span>
              </div>
              <ul className="space-y-3">
                {["Unlimited visits for all", "Pediatric triage", "Family prevention", "Coordination"].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <p className="text-xs text-center text-muted-foreground">Available in select states.</p>
              <Button className="w-full" variant="default" asChild>
                <Link href="/book">
                  Book Free Intro Call
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
function TransparencySection() {
  return (
    <section className="py-20 bg-background border-t border-border">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
          <div>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-primary">
              <Check className="h-6 w-6" /> Included
            </h3>
            <ul className="space-y-3">
              {["Sick visits", "Rashes & skin issues", "UTIs", "Refills", "Chronic care (BP, lipids, diabetes)", "Prevention planning", "Referrals & coordination"].map((item) => (
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
              {["Emergency care (call 911)", "Hospital bills", "Most labs/imaging (billed separately at transparent prices)", "Prescriptions (except vaccines)"].map((item) => (
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
function FAQSection() {
  const faqs = [
    { question: "Do I still need insurance?", answer: "Yes—keep insurance for emergencies, hospital care, and specialists. DPC is a membership for your primary care needs, not insurance." },
    { question: "Can I use my HSA for this?", answer: "Starting Jan 1, 2026, eligible individuals may use HSA funds for qualifying DPC fees, subject to IRS rules and monthly limits. Consult a tax professional." },
    { question: "Why is enrollment limited?", answer: "To protect your access. We cap membership to ensure you can always reach your doctor when you need them—no more 3-week waits." },
    { question: "What states are you available in?", answer: "We're available in select states and expanding. Check during signup (before payment) or book a free intro call to confirm." }
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
        <h2 className="text-3xl font-bold mb-4">Ready to meet your doctor?</h2>
        <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
          Limited spots available. Book a free intro call to see if we're a fit.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" variant="secondary" className="text-lg px-8 h-12">
            <Link href="/book">
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
            <Link href="/book">
              <Button size="sm" className="rounded-full px-6 bg-primary text-primary-foreground hover:bg-primary/90">
                Book Intro Call <Phone className="ml-2 h-4 w-4" />
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
// MAIN PAGE
// ============================================================================
export default function Home() {
  return (
    <>
      <HeroOptimized />
      <FounderQuote />
      <ComparisonSection />
      <SummaryGrid />
      <HsaInfoSection />
      <PricingCards />
      <TransparencySection />
      <FAQSection />
      <FinalCTA />
      <StickyCTA />
    </>
  );
}

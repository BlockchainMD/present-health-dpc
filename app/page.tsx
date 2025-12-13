"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Check, CheckCircle, MessageCircle, Clock, Shield, Heart, Star, Phone, ArrowRight, X, UserCheck, ShieldCheck, CheckCircle2 } from "lucide-react";
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
// HERO V2 - Upgraded CTA cluster + Trust Chips
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
            Text your doctor. Same- or next-day telehealth visits. Clear plans and follow-through—without the portal ping-pong.
          </p>
          <p className="text-sm text-muted-foreground mb-8 font-medium">
            Available in <strong>select states</strong>. Availability varies by state. Not for emergencies—call 911.
          </p>
          <p className="text-sm font-medium text-emerald-600 mb-8 bg-emerald-50 inline-block px-3 py-1 rounded-full border border-emerald-100">
            Starting <strong>Jan 1, 2026</strong>: DPC memberships may be <strong>HSA-payable</strong> for eligible individuals, subject to IRS rules and limits.*
          </p>

          {/* UPGRADED CTA CLUSTER */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
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

          <p className="text-sm text-muted-foreground mb-8">
            Plans start at <strong>$129/mo</strong> (Individual) and <strong>$279/mo</strong> (Family).
          </p>

          {/* Text link for HSA info */}
          <p className="text-sm text-muted-foreground mb-8">
            <Link href="#hsa-info" className="underline hover:text-primary transition-colors">
              How does HSA work with DPC? →
            </Link>
          </p>

          {/* TRUST CHIPS */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>Secure, HIPAA-conscious care</span>
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
              <span>Membership capped to protect access</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// EXPECTATIONS SECTION (Replaces Testimonials)
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
        <p className="text-center text-xs text-muted-foreground mt-8">Member stories coming soon.</p>
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
    { icon: Clock, title: "Same- or Next-Day Telehealth", desc: "Sick today? Get seen quickly by text/video/phone. If you need in-person care, we’ll coordinate locally." },
    { icon: Heart, title: "Preventive Care", desc: "Annual wellness plans tailored to your goals." },
    { icon: Shield, title: "Transparent, fair cash-pay coordination", desc: "When you need labs, imaging, or prescriptions, we help you find fair self-pay options. You pay third parties directly." }
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
// SOCIAL PROOF V2 (Trust Strip)
// ============================================================================
function SocialProofV2() {
  const items = [
    {
      icon: <UserCheck className="h-6 w-6 text-primary" />,
      text: "10+ years experience",
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-primary" />,
      text: "Board-certified family medicine",
    },
    {
      icon: <CheckCircle2 className="h-6 w-6 text-primary" />,
      text: "No insurance billing / no middlemen",
    },
    {
      icon: <Clock className="h-6 w-6 text-primary" />,
      text: "Direct physician access (responses typically within 1 business day). If something feels urgent, don’t wait—seek urgent care or call 911.",
    },
  ];

  return (
    <section className="bg-muted/30 border-y border-border py-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-3 justify-center sm:justify-start">
              <div className="flex-shrink-0">{item.icon}</div>
              <span className="text-sm font-medium text-foreground">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// WHY PRESENT HEALTH V2 (Primary Care is Broken)
// ============================================================================
function WhyPresentHealthV2() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6 text-center max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
          Primary care is broken for busy people.
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          If your doctor is booked for 3 weeks and every visit feels rushed, you’re not getting primary care—you’re getting a throughput system. <strong className="text-foreground">Present Health is different:</strong> Present Health is a small, physician-led, <strong>virtual-first</strong> DPC practice—available in <strong>select states</strong>—built for prevention, coordination, and real access.
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// HSA INFO V2
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
            Starting <strong>Jan 1, 2026</strong>, eligible individuals enrolled in certain Direct Primary Care (DPC) service arrangements may <strong>contribute to an HSA</strong> and may use <strong>HSA funds tax-free to pay periodic DPC fees</strong>, subject to IRS rules and monthly limits.
          </p>
          <p className="text-sm text-emerald-800/80 mt-2">
            For 2026, the monthly limit is <strong>$150 (individual)</strong> / <strong>$300 (family)</strong>, indexed for inflation.
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
                <p className="text-sm text-emerald-900/80">Choose an HSA-eligible plan if you want to contribute to an HSA.</p>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">2</div>
                <p className="text-sm text-emerald-900/80">Join Present Health ($129 Individual / $279 Family), within the 2026 monthly limits.</p>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">3</div>
                <p className="text-sm text-emerald-900/80">Pay with your HSA card or reimburse yourself, and keep documentation for your records.</p>
              </div>
            </CardContent>
          </Card>

          <div className="bg-emerald-100/50 p-6 rounded-xl border border-emerald-200">
            <h3 className="font-semibold text-emerald-900 mb-3">Note on labs + prescriptions</h3>
            <p className="text-sm text-emerald-800/80 leading-relaxed">
              To keep the membership within the IRS definition of qualifying primary care services, the membership fee covers primary care services only. <strong>Prescriptions (other than vaccines)</strong> and certain <strong>lab services</strong> are handled separately at transparent prices when needed.
            </p>
          </div>
        </div>
        <p className="text-center text-xs text-emerald-800/60 mt-8 max-w-2xl mx-auto">
          *HSA eligibility and reimbursement rules depend on your plan and personal situation. This is not tax advice.
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// PRICING CARDS V2
// ============================================================================
function PricingCardsV2() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Simple membership. No insurance billing. Cancel anytime.
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
          {/* Individual Plan */}
          <Card className="flex flex-col border-border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-2xl">Individual</CardTitle>
              <CardDescription>For the solo health optimizer.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="mb-6">
                <span className="text-4xl font-bold">${isAnnual ? 1419 : 129}</span>
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
              <p className="text-xs text-center text-muted-foreground">Available in select states. You’ll confirm eligibility before checkout.</p>
              <Button className="w-full" asChild>
                <Link href={`/register?plan=individual&billing=${isAnnual ? 'annual' : 'monthly'}`}>
                  Get Started
                </Link>
              </Button>
              <p className="text-xs text-center text-muted-foreground font-medium">Cancel Anytime</p>
            </CardFooter>
          </Card>

          {/* Family Plan */}
          <Card className="flex flex-col border-primary shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
              BEST VALUE
            </div>
            <CardHeader>
              <CardTitle className="text-2xl">Family</CardTitle>
              <CardDescription>Includes partner + children (up to 5 total).</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="mb-6">
                <span className="text-4xl font-bold">${isAnnual ? 3069 : 279}</span>
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
              <p className="text-xs text-center text-muted-foreground">Available in select states. You’ll confirm eligibility before checkout.</p>
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
// TRANSPARENCY V2
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
              {["Sick visits", "Rashes", "UTIs", "Refills", "Chronic care (BP, lipids, diabetes)", "Prevention planning", "Referrals"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                  {item}
                </li>
              ))}
              <li className="flex items-center gap-3 text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                Examples: colds/flu, rashes, UTIs, refills, BP/lipids/diabetes follow-up, prevention planning, referrals.
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-muted-foreground">
              <X className="h-6 w-6" /> Not Included
            </h3>
            <ul className="space-y-3">
              {[
                "Emergency care (call 911)",
                "Hospital bills",
                "Most labs/imaging and prescriptions (billed separately when needed)"
              ].map((item) => (
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
// FAQ V2
// ============================================================================
function FAQAccordionV2() {
  const faqs = [
    {
      question: "Do I still need insurance?",
      answer: "Yes—keep insurance for emergencies, hospital care, and specialists. DPC isn’t insurance; it's a membership for your primary care needs."
    },
    {
      question: "Can I use my HSA for this?",
      answer: "Starting Jan 1, 2026, eligible individuals may be able to use HSA funds for qualifying DPC fees, subject to IRS rules and monthly limits. We recommend consulting a tax professional."
    },
    {
      question: "Why is enrollment limited?",
      answer: "Because access is the product. We cap membership to protect response times and ensure you can always reach your doctor when you need them."
    },
    {
      question: "What states are you available in?",
      answer: "We’re available in select states and expanding. You can check availability during signup (before payment) or book a free intro call."
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6 max-w-3xl">
        <h2 className="text-3xl font-bold tracking-tight mb-12 text-center">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left font-medium text-lg">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

// ============================================================================
// FINAL CTA BAND
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
// STICKY CTA
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
export default function Home() {
  return (
    <>
      {/* 1. Upgraded Hero with Trust Chips */}
      <HeroV2 />

      {/* 2. Expectations Section (Replaces Testimonials) */}
      <ExpectationsSection />

      {/* 3. 4-Up Summary Grid (skim layer) */}
      <SummaryGrid />

      {/* 4. Narrative sections */}
      <SocialProofV2 />
      <WhyPresentHealthV2 />

      <HsaInfoV2 />
      <PricingCardsV2 />
      <TransparencyV2 />
      <FAQAccordionV2 />

      {/* 5. Final CTA Band */}
      <FinalCTA />

      {/* 6. Sticky CTA (appears after scroll) */}
      <StickyCTA />
    </>
  );
}

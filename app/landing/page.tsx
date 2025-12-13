"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, MessageCircle, Clock, Shield, Heart, Star, Phone, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
    return (
        <div className="min-h-screen">
            {/* Hero Section - Optimized */}
            <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-emerald-50 via-white to-emerald-50 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200 rounded-full blur-3xl" />
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-100 rounded-full blur-3xl" />
                </div>

                <div className="container mx-auto px-4 md:px-6 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left: Text Content */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            {/* HSA Badge - Larger */}
                            <div className="inline-flex items-center gap-2 bg-emerald-100 border-2 border-emerald-300 text-emerald-800 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                                <Check className="h-4 w-4" />
                                HSA-Eligible Starting 2026*
                            </div>

                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6">
                                A doctor who <span className="text-emerald-600">knows your name.</span>
                            </h1>

                            <p className="text-xl text-gray-600 mb-4 max-w-xl">
                                Text your doctor. Get seen today. No insurance hassles.
                            </p>

                            <p className="text-lg text-gray-500 mb-8">
                                Unlimited virtual visits, direct messaging, and a physician who actually has time for you.
                            </p>

                            {/* CTAs - Strong & Specific */}
                            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                <Link href="/register">
                                    <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 py-6 shadow-lg shadow-orange-200">
                                        Join Now – $129/mo
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </Link>
                                <Link href="/pricing">
                                    <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2">
                                        <Phone className="mr-2 h-5 w-5" />
                                        Book a Free Intro Call
                                    </Button>
                                </Link>
                            </div>

                            {/* Trust Indicators */}
                            <div className="flex items-center gap-6 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                    <Shield className="h-4 w-4 text-emerald-600" />
                                    <span>HIPAA Compliant</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Check className="h-4 w-4 text-emerald-600" />
                                    <span>No contracts</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Check className="h-4 w-4 text-emerald-600" />
                                    <span>Cancel anytime</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Right: Hero Image */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="relative"
                        >
                            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
                                <Image
                                    src="/images/hero-doctor.png"
                                    alt="Doctor on video call"
                                    width={600}
                                    height={500}
                                    className="w-full h-auto object-cover"
                                    priority
                                />
                                {/* Overlay Badge */}
                                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
                                    <p className="text-sm font-semibold text-gray-800">Dr. J. – Family Medicine</p>
                                    <p className="text-xs text-emerald-600">Available now</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section - NEW */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">What Our Members Say</h2>
                        <p className="text-gray-600">Real patients, real experiences.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {[
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
                        ].map((testimonial, i) => (
                            <Card key={i} className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex gap-1 mb-4">
                                        {Array.from({ length: testimonial.stars }).map((_, j) => (
                                            <Star key={j} className="h-5 w-5 fill-orange-400 text-orange-400" />
                                        ))}
                                    </div>
                                    <p className="text-gray-700 mb-4 italic">"{testimonial.quote}"</p>
                                    <div>
                                        <p className="font-semibold text-gray-900">{testimonial.name}</p>
                                        <p className="text-sm text-gray-500">{testimonial.role}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* What You Get - Benefits */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything You Need, Nothing You Don't</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">No surprise bills. No insurance codes. Just actual care.</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                        {[
                            { icon: MessageCircle, title: "Direct Messaging", desc: "Text your doctor directly. Get answers, not phone trees." },
                            { icon: Clock, title: "Same-Day Visits", desc: "Sick today? See your doctor today. Virtually or in-person." },
                            { icon: Heart, title: "Preventive Care", desc: "Annual wellness plans tailored to your goals." },
                            { icon: Shield, title: "Transparent Pricing", desc: "Labs and meds at wholesale cost. No hidden fees." }
                        ].map((item, i) => (
                            <Card key={i} className="border-0 shadow-sm bg-white">
                                <CardContent className="p-6 text-center">
                                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 mb-4">
                                        <item.icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                                    <p className="text-sm text-gray-600">{item.desc}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing - Simplified */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, Honest Pricing</h2>
                        <p className="text-gray-600">No contracts. Cancel anytime. HSA-eligible starting 2026.*</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                        {/* Individual */}
                        <Card className="border-2 border-gray-200 hover:border-emerald-300 transition-colors">
                            <CardContent className="p-8">
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">Individual</h3>
                                <div className="flex items-baseline gap-1 mb-4">
                                    <span className="text-4xl font-bold text-gray-900">$129</span>
                                    <span className="text-gray-500">/month</span>
                                </div>
                                <ul className="space-y-3 mb-6">
                                    <li className="flex items-center gap-2 text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-emerald-600" /> Unlimited virtual visits
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-emerald-600" /> Direct messaging
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-emerald-600" /> Annual wellness review
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-emerald-600" /> Wholesale lab pricing
                                    </li>
                                </ul>
                                <Link href="/register?plan=individual">
                                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                                        Get Started
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* Family */}
                        <Card className="border-2 border-emerald-500 relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                                Best Value
                            </div>
                            <CardContent className="p-8">
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">Family</h3>
                                <div className="flex items-baseline gap-1 mb-4">
                                    <span className="text-4xl font-bold text-gray-900">$279</span>
                                    <span className="text-gray-500">/month</span>
                                </div>
                                <ul className="space-y-3 mb-6">
                                    <li className="flex items-center gap-2 text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-emerald-600" /> Up to 5 family members
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-emerald-600" /> All individual benefits
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-emerald-600" /> Pediatric care included
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-gray-600">
                                        <Check className="h-4 w-4 text-emerald-600" /> Family wellness planning
                                    </li>
                                </ul>
                                <Link href="/register?plan=family">
                                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                                        Get Started
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>

                    <p className="text-center text-xs text-gray-400 mt-8 max-w-md mx-auto">
                        *HSA/FSA eligibility starts Jan 1, 2026, subject to IRS rules. Consult a tax professional.
                    </p>
                </div>
            </section>

            {/* Final CTA - Urgency */}
            <section className="py-20 bg-emerald-900 text-white">
                <div className="container mx-auto px-4 md:px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to get a doctor who actually knows you?</h2>
                    <p className="text-emerald-200 mb-8 max-w-xl mx-auto">
                        Limited spots available. We cap enrollment to ensure every member gets the access they deserve.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/register">
                            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 py-6 shadow-lg">
                                Join Now – $129/mo
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Link href="/#faq">
                            <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-white text-white hover:bg-white/10">
                                Got Questions?
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

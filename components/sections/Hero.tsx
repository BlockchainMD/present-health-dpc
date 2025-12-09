"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function Hero() {
    return (
        <section className="relative pt-20 pb-32 md:pt-32 md:pb-48 overflow-hidden">
            <div className="container px-4 md:px-6 mx-auto relative z-10">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="inline-flex items-center rounded-full border border-primary/10 bg-white/50 px-4 py-1.5 text-sm font-medium text-primary mb-8 backdrop-blur-md shadow-sm">
                            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                            New 2026 HSA Rules Compliant
                        </div>
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6">
                            A Doctor Who Knows Your Name. <br className="hidden md:block" />
                            <span className="text-primary">Paid With Pre-Tax Dollars.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                            The first virtual practice designed for the modern patient. Text your doctor, skip the waiting room,
                            and pay $0 out of pocket using the new 2026 HSA rules.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Button size="lg" className="h-12 px-8 text-lg w-full sm:w-auto" asChild>
                                <Link href="/pricing">
                                    Become a Member <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                            <Button variant="outline" size="lg" className="h-12 px-8 text-lg w-full sm:w-auto" asChild>
                                <Link href="#benefits">
                                    How the HSA Savings Work
                                </Link>
                            </Button>
                        </div>
                        <p className="mt-4 text-sm text-muted-foreground italic">Limited availability for 2026</p>
                        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-primary mb-1">10 Years</div>
                                <div className="text-xs text-muted-foreground">Experience</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-primary mb-1">Board Certified</div>
                                <div className="text-xs text-muted-foreground">Family Medicine</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-primary mb-1">0</div>
                                <div className="text-xs text-muted-foreground">Insurance Middlemen</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-primary mb-1">24/7</div>
                                <div className="text-xs text-muted-foreground">Digital Access</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Background Gradient */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
                    <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl mix-blend-multiply animate-blob"></div>
                    <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-secondary/30 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-32 left-1/3 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-4000"></div>
                </div>
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20"></div>
            </div>
        </section>
    );
}

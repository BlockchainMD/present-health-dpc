"use client";

import { MessageSquare, Stethoscope, Clock, Heart } from "lucide-react";

export function WhatYouGet() {
    return (
        <section className="py-24 bg-background">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                        Primary Care, Unbundled.
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Stop paying insurance premiums for day-to-day health. Get concierge-level service for a simple monthly fee.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                    {/* Your Doctor, In Your Pocket */}
                    <div className="group bg-card hover:bg-muted/50 rounded-3xl p-8 border border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="mb-6 inline-flex p-3 rounded-2xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                            <MessageSquare className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-semibold mb-3 tracking-tight">Your Doctor, In Your Pocket</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Have a weird rash? Need a refill? Just text me. No portals, no gatekeepers.
                            Direct access to my personal line.
                        </p>
                    </div>

                    {/* Virtual First, Not Virtual Only */}
                    <div className="group bg-card hover:bg-muted/50 rounded-3xl p-8 border border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="mb-6 inline-flex p-3 rounded-2xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                            <Stethoscope className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-semibold mb-3 tracking-tight">Virtual First, Not Virtual Only</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            We handle 90% of issues via video, phone, or text. If you need labs or imaging,
                            I coordinate it all near you—often at 90% off list prices.
                        </p>
                    </div>

                    {/* Wait Lists are for Other People */}
                    <div className="group bg-card hover:bg-muted/50 rounded-3xl p-8 border border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="mb-6 inline-flex p-3 rounded-2xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                            <Clock className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-semibold mb-3 tracking-tight">Wait Lists are for Other People</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Same-day or next-day appointments are the standard, not the exception.
                            No 3-week waits to see your doctor.
                        </p>
                    </div>

                    {/* A Partner, Not a Provider */}
                    <div className="group bg-card hover:bg-muted/50 rounded-3xl p-8 border border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="mb-6 inline-flex p-3 rounded-2xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                            <Heart className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-semibold mb-3 tracking-tight">A Partner, Not a Provider</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            I treat the whole patient. Mental health, metabolic health, and longevity—not just 15-minute sick visits.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

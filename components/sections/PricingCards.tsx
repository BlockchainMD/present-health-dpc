"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function PricingCards() {
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

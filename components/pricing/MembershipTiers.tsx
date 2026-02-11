import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { EMPLOYER_TIER, MEMBERSHIP_TIERS, type CoverageType } from "@/lib/pricing";

const ORDER: CoverageType[] = ["individual", "couple", "family"];

export function MembershipTiers() {
    return (
        <section aria-label="Membership tiers" className="py-16 md:py-20 bg-background">
            <div className="container mx-auto px-4 md:px-6">
                <div className="max-w-3xl mx-auto text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Membership tiers</h2>
                    <p className="text-lg text-muted-foreground">
                        One flat monthly fee for primary care access.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 items-stretch max-w-6xl mx-auto">
                    {ORDER.map((key) => {
                        const tier = MEMBERSHIP_TIERS[key];
                        return (
                            <Card
                                key={key}
                                className={key === "individual" ? "border-primary/40 shadow-md" : "border-border/60"}
                            >
                                <CardHeader className="space-y-2">
                                    <div className="flex items-start justify-between gap-3">
                                        <CardTitle className="text-xl">{tier.name}</CardTitle>
                                        {key === "couple" ? <Badge variant="secondary">Save ~10%</Badge> : null}
                                    </div>
                                    <CardDescription>{tier.tagline}</CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-5">
                                    <div>
                                        <div className="flex items-end gap-2">
                                            <div className="text-4xl font-bold">${tier.monthlyDollars}</div>
                                            <div className="text-muted-foreground mb-1">/month</div>
                                        </div>
                                    </div>

                                    <ul className="space-y-2 text-sm">
                                        {tier.includes.map((feature) => (
                                            <li key={feature} className="flex gap-2">
                                                <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>

                                <CardFooter className="mt-auto flex flex-col gap-3">
                                    <Button asChild className="w-full">
                                        <Link href={`/join?plan=${key}`}>Join {tier.name}</Link>
                                    </Button>
                                    <Button asChild variant="outline" className="w-full">
                                        <Link href="/book">Book a free intro call</Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}

                    <Card className="border-border/60">
                        <CardHeader className="space-y-2">
                            <CardTitle className="text-xl">{EMPLOYER_TIER.name}</CardTitle>
                            <CardDescription>
                                For groups of {EMPLOYER_TIER.minEmployees}+ employees.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div>
                                <div className="flex items-end gap-2">
                                    <div className="text-4xl font-bold">${EMPLOYER_TIER.monthlyPerEmployeeDollars}</div>
                                    <div className="text-muted-foreground mb-1">/employee/month</div>
                                </div>
                            </div>
                            <ul className="space-y-2 text-sm">
                                {["Group onboarding support", "Care access across eligible states", "Simple per-employee pricing"].map(
                                    (feature) => (
                                        <li key={feature} className="flex gap-2">
                                            <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                            <span>{feature}</span>
                                        </li>
                                    )
                                )}
                            </ul>
                        </CardContent>
                        <CardFooter className="mt-auto">
                            <Button asChild variant="outline" className="w-full">
                                <Link href="/for-employers">See employer details</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                <div className="max-w-3xl mx-auto mt-10 text-sm text-muted-foreground text-center">
                    Present Health is Direct Primary Care (DPC), not insurance. Consider keeping insurance for emergencies,
                    hospital care, and specialists.
                </div>
            </div>
        </section>
    );
}

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export function PricingCards() {
    return (
        <section className="py-12">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Individual Tier */}
                    <Card className="flex flex-col border-border/50 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold text-primary">Individual</CardTitle>
                            <CardDescription>For the solo health optimizer.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-foreground">$129</span>
                                <span className="text-muted-foreground">/mo</span>
                                <p className="text-sm text-primary font-medium mt-1">HSA/FSA Eligible</p>
                            </div>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    Unlimited virtual visits
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    Direct text/email with your doctor
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    Care coordination & referrals
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    Annual wellness planning
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" asChild>
                                <Link href="/register?plan=individual">
                                    Choose Individual
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Family Tier */}
                    <Card className="flex flex-col border-primary shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                            BEST VALUE
                        </div>
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold text-primary">Family</CardTitle>
                            <CardDescription>Comprehensive care for the whole house.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-foreground">$279</span>
                                <span className="text-muted-foreground">/mo</span>
                                <p className="text-sm text-primary font-medium mt-1">HSA/FSA Eligible</p>
                            </div>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    Includes partner + children (up to 5 total)
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    Unlimited virtual visits for all
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    Pediatric triage & guidance
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    Family health strategy
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" asChild>
                                <Link href="/register?plan=family">
                                    Choose Family
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                <div className="mt-8 text-center max-w-2xl mx-auto">
                    <p className="text-xs text-muted-foreground">
                        *To maximize your HSA benefits and maintain IRS compliance, labs and prescriptions are billed at-cost separately.
                        This structure ensures your membership fee remains 100% tax-deductible under the new 2026 rules.
                    </p>
                </div>
            </div>
        </section>
    );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export function Hero() {
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

                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                        <Button asChild size="lg" className="text-lg px-8 h-12 bg-primary text-primary-foreground hover:bg-primary/90">
                            <Link href="/pricing">
                                See Pricing
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="text-lg px-8 h-12">
                            <Link href="/#hsa-info">
                                How HSA Works
                            </Link>
                        </Button>
                    </div>

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

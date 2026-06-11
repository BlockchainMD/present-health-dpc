import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
    title: "After Your Weight-Loss Program Ends: Protecting the Health You Gained | Present Health",
    description:
        "Your weight-loss program ended — by choice, cost, or coverage. Research shows blood pressure and cholesterol gains can reverse within 1–2 years of stopping. Here's how physician-led maintenance protects them. $99/month.",
};

export default function AfterWeightLossPage() {
    const watchList = [
        "Blood pressure — often the first number to drift back",
        "Cholesterol and ApoB — improvements fade as weight returns",
        "Blood sugar / A1c — especially if you were prediabetic before",
        "Muscle mass — a meaningful share of rapid weight loss can be lean tissue; what you regain shouldn't be all fat",
    ];

    const program = [
        "A board-certified physician reviews where you started, what you achieved, and what medications or programs you used",
        "Baseline labs now — so drift is caught in months, not at a crisis",
        "A written maintenance plan: nutrition targets, strength training, and medication management where appropriate",
        "Quarterly re-tests with trends you can see on your dashboard",
    ];

    return (
        <div className="container px-4 md:px-6 mx-auto py-24 max-w-3xl">
            <header className="mb-10">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                    Your weight-loss program ended. Your health gains don&apos;t have to.
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    Maybe your coverage changed. Maybe the program got too expensive, or you reached your goal. Either
                    way, you&apos;re in a window that matters more than most people realize.
                </p>
            </header>

            <section className="space-y-6 text-muted-foreground">
                <h2 className="text-2xl font-bold text-foreground">What the research shows</h2>
                <p>
                    Large reviews of people who stopped weight-loss treatment find weight returns gradually — and the
                    cardiovascular improvements that came with it (blood pressure, cholesterol) trend back toward
                    baseline within roughly one to two years of stopping. About half of people who start these
                    programs discontinue within a year, and almost no one gets structured follow-through afterward.
                    The gains are real. They&apos;re just not self-maintaining — and usually no one is watching.
                </p>

                <h2 className="text-2xl font-bold text-foreground">The numbers worth watching</h2>
                <div className="grid gap-3">
                    {watchList.map((item) => (
                        <div key={item} className="flex gap-3 items-start">
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>

                <h2 className="text-2xl font-bold text-foreground">What physician-led maintenance looks like</h2>
                <Card className="border-border/70">
                    <CardHeader>
                        <CardTitle>The landing pad</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {program.map((item) => (
                            <div key={item} className="flex gap-3 items-start">
                                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{item}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <p>
                    Flat $99/month, no insurance needed, HSA-eligible — typically less than the program fee you were
                    paying, with far more direct physician contact. We are not affiliated with any weight-loss program
                    or drug manufacturer; our only incentive is your numbers.
                </p>

                <div className="pt-4 text-center">
                    <Button asChild size="lg" className="h-12 px-8">
                        <Link href="/join">Start Membership</Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}

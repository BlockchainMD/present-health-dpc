import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
    title: "High Calcium Score? What To Do Next | Present Health",
    description:
        "A coronary calcium score over zero means plaque is already there — but it's also the strongest motivator in preventive cardiology. Here's what the evidence says to do next, and how a $99/month physician membership manages it.",
};

export default function CalciumScorePage() {
    const nextSteps = [
        "Get your ApoB measured — it's the particle count that drives future plaque, and it tells us how aggressive to be",
        "Know your blood pressure load — home readings beat one office number",
        "Build a written risk-reduction plan with a physician — targets, medications if warranted, and a re-test schedule",
        "Re-measure on a schedule so you can see the trend, not guess at it",
    ];

    return (
        <div className="container px-4 md:px-6 mx-auto py-24 max-w-3xl">
            <header className="mb-10">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                    Your calcium score came back high. Now what?
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    First: a coronary artery calcium (CAC) score above zero is not a verdict. It is information most
                    people never get — and acting on it is exactly where prevention works.
                </p>
            </header>

            <section className="space-y-6 text-muted-foreground">
                <h2 className="text-2xl font-bold text-foreground">What your score actually means</h2>
                <p>
                    A CAC scan counts calcified plaque in the arteries that supply your heart. A score of zero is
                    powerful reassurance. A score above zero means the disease process has started — and the higher
                    the number, the more it matters. What deserves more attention: in a randomized trial of over
                    2,000 adults (the EISNER study), people who simply <em>saw</em> their calcium score had better
                    blood pressure, cholesterol, and waistlines four years later than people who didn&apos;t. Knowing
                    the number changes behavior. Managing it changes outcomes.
                </p>

                <h2 className="text-2xl font-bold text-foreground">What the evidence says to do next</h2>
                <div className="grid gap-3">
                    {nextSteps.map((item) => (
                        <div key={item} className="flex gap-3 items-start">
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
                <p>
                    What not to do: spend the next year on supplements marketed for &quot;cholesterol support.&quot; In
                    a Cleveland Clinic randomized trial, six of the most popular ones performed no better than
                    placebo. Evidence-based care is less glamorous and far more effective.
                </p>

                <h2 className="text-2xl font-bold text-foreground">Where Present Health fits</h2>
                <Card className="border-border/70">
                    <CardHeader>
                        <CardTitle>The step after the scan</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-muted-foreground">
                        <p>
                            Most people get a calcium score, a PDF, and a &quot;discuss with your doctor.&quot; Present
                            Health is the discussion — and the follow-through. A board-certified physician baselines
                            your ApoB and blood pressure, builds your plan, and tracks every number with you until it
                            moves the right way. Flat $99/month, no insurance needed, HSA-eligible.
                        </p>
                        <div className="pt-2">
                            <Button asChild size="lg" className="h-12 px-8">
                                <Link href="/join">Start Membership</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <p className="text-sm">
                    Don&apos;t have a score yet? In Michigan, self-pay CAC scans are widely available for roughly
                    $50–$150 cash. We&apos;re happy to point you to transparent-price imaging near you — ask after you
                    join, or <Link href="/visit" className="underline">request a single visit</Link>.
                </p>
            </section>
        </div>
    );
}

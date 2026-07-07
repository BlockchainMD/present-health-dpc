import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
    title: "Heart Disease Runs in Your Family. Here's What to Actually Do About It | Present Health",
    description:
        "A parent or sibling with early heart disease roughly doubles your own risk — and standard cholesterol and blood-pressure numbers can look fine while inherited risk builds silently. Here's the prevention work that standard visits usually skip. $99/month, HSA-eligible.",
};

export default function FamilyHistoryPage() {
    const whyItMatters = [
        "A heart attack or stroke in a father or brother before 55, or a mother or sister before 65, is considered a premature event — the kind that signals inherited risk, not just bad luck",
        "That history is an independent risk factor: it raises your risk even when your cholesterol and blood pressure look normal today",
        "Risk calculators built for the general population tend to under-weight family history, so a 'low-risk' score can be falsely reassuring",
    ];

    const whatWeCheck = [
        "Lp(a) — a largely inherited particle that drives early heart disease. Roughly 1 in 5 people carry an elevated level, it's measured just once in a lifetime, and most people are never tested for it at all",
        "ApoB — a truer count of the cholesterol particles that actually clog arteries, often more revealing than a standard LDL number",
        "A coronary artery calcium (CAC) score — a low-dose scan that shows whether inherited risk has already started to become visible plaque",
        "Blood pressure and metabolic markers tracked as a trend over time, not a single reading at one rushed visit",
    ];

    const program = [
        "A board-certified physician takes an actual family history — who, what, and how young — and builds your plan around it",
        "The inherited-risk labs above, ordered up front at transparent cash prices instead of waiting for a problem",
        "A written prevention plan: what your numbers mean, what to change, and when medication is genuinely warranted",
        "Quarterly follow-through with trends on your dashboard, so drift is caught in months, not at an emergency",
    ];

    return (
        <div className="container px-4 md:px-6 mx-auto py-24 max-w-3xl">
            <header className="mb-10">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                    Heart disease runs in your family. Your story doesn&apos;t have to be the same.
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    If you watched a parent or sibling have a heart attack young, you already carry a question most
                    people never ask until it&apos;s late: is the same thing building in me? A family history is one of
                    the strongest signals in prevention — and one of the most overlooked in a normal fifteen-minute
                    visit.
                </p>
            </header>

            <section className="space-y-6 text-muted-foreground">
                <h2 className="text-2xl font-bold text-foreground">Why family history is a real signal</h2>
                <div className="grid gap-3">
                    {whyItMatters.map((item) => (
                        <div key={item} className="flex gap-3 items-start">
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
                <p>
                    The reassuring part: inherited risk is not a verdict. Caught early, it&apos;s one of the most
                    modifiable situations in all of medicine. The problem is almost never that nothing can be done —
                    it&apos;s that no one looked in time.
                </p>

                <h2 className="text-2xl font-bold text-foreground">What standard visits usually skip</h2>
                <p>
                    A routine physical checks a basic cholesterol panel and a blood pressure. That&apos;s a start, but
                    it can miss the very markers that inherited risk hides in. When heart disease runs in your family,
                    these are the numbers worth knowing:
                </p>
                <div className="grid gap-3">
                    {whatWeCheck.map((item) => (
                        <div key={item} className="flex gap-3 items-start">
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
                <p>
                    If you&apos;ve already had a calcium scan or want to understand what a score means, our{" "}
                    <Link href="/calcium-score" className="text-primary underline underline-offset-4">
                        calcium score guide
                    </Link>{" "}
                    walks through it.
                </p>

                <h2 className="text-2xl font-bold text-foreground">What physician-led prevention looks like</h2>
                <Card className="border-border/70">
                    <CardHeader>
                        <CardTitle>Built around your inherited risk</CardTitle>
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
                    Flat $99/month for an individual or $179/month for a household, no insurance needed, and{" "}
                    <Link href="/hsa" className="text-primary underline underline-offset-4">
                        HSA-eligible
                    </Link>
                    . Labs and imaging aren&apos;t bundled into the fee — you pay those separately at transparent cash
                    rates — so the membership stays a straightforward primary-care relationship focused on one thing:
                    your numbers.
                </p>

                <h2 className="text-2xl font-bold text-foreground">Honest fine print</h2>
                <p>
                    This page is general information, not medical advice, and family history is one input among many —
                    a physician weighs it alongside your own labs, history, and goals. Lp(a) and CAC testing aren&apos;t
                    right for everyone in every situation; part of the visit is deciding which of these actually make
                    sense for you. Present Health is a Michigan-based cash-pay membership and does not bill insurance.
                </p>

                <div className="pt-6 flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild size="lg" className="h-12 px-8">
                        <Link href="/join">Start Membership — $99/month</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="h-12 px-8">
                        <Link href="/pricing">See what&apos;s included</Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonLd } from "@/components/seo/JsonLd";
import { MEMBERSHIP_TIERS, type CoverageType } from "@/lib/pricing";

export const metadata: Metadata = {
    title: "Join | Present Health",
    description: "Join Present Health. Choose a membership tier and get telehealth-first Direct Primary Care with transparent pricing.",
};

type JoinPageProps = {
    searchParams?: { [key: string]: string | string[] | undefined };
};

function pickSearchValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

function normalizePlan(value: string | undefined): CoverageType {
    if (value === "couple") return "couple";
    if (value === "family") return "family";
    return "individual";
}

export default function JoinPage({ searchParams }: JoinPageProps) {
    const selectedPlan = normalizePlan(pickSearchValue(searchParams?.plan));
    const orderedPlans = (["individual", "couple", "family"] as CoverageType[]).sort((a, b) => {
        if (a === selectedPlan) return -1;
        if (b === selectedPlan) return 1;
        return 0;
    });
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Join Present Health",
        description: metadata.description,
    };

    return (
        <div className="container px-4 md:px-6 mx-auto py-24 max-w-5xl">
            <JsonLd data={jsonLd} />

            <header className="max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Join Present Health</h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    Become a member in minutes. You will confirm state availability before payment.
                </p>
            </header>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
                {orderedPlans.map((key) => {
                    const tier = MEMBERSHIP_TIERS[key];
                    const isSelected = key === selectedPlan;
                    return (
                        <Card key={key} className={isSelected ? "border-primary/40 shadow-sm" : "border-border/60"}>
                            <CardHeader>
                                <CardTitle>
                                    {tier.name}
                                    {isSelected ? (
                                        <span className="ml-2 align-middle text-xs rounded-full bg-primary/10 text-primary px-2 py-1">
                                            Selected
                                        </span>
                                    ) : null}
                                </CardTitle>
                                <CardDescription>
                                    ${tier.monthlyDollars}/month
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                                    {tier.includes.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                                <div className="flex gap-3">
                                    <Button asChild>
                                        <Link href={`/register?plan=${key}`}>Continue with {tier.name}</Link>
                                    </Button>
                                    <Button asChild variant="outline">
                                        <Link href="/pricing">See pricing details</Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="mt-10 rounded-2xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                <div className="font-medium text-foreground mb-2">What happens next</div>
                <ol className="list-decimal list-inside space-y-1">
                    <li>Create your account</li>
                    <li>Choose your membership</li>
                    <li>Complete checkout</li>
                    <li>Schedule your onboarding visit</li>
                </ol>
            </div>
        </div>
    );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonLd } from "@/components/seo/JsonLd";
import { MEMBERSHIP_ANNUAL_DOLLARS, MEMBERSHIP_MONTHLY_DOLLARS } from "@/lib/pricing";

export const metadata: Metadata = {
    title: "Join | Present Health",
    description: "Join Present Health in minutes. One plan: $99/month or $990/year. Messaging-first primary care for adults 18+.",
};

export default function JoinPage() {
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
                    One plan. Everything included. Start your membership in minutes.
                </p>
            </header>

            <Card className="mt-12 border-primary/40 shadow-sm overflow-hidden">
                <div className="bg-primary/5 px-6 py-2 text-primary text-xs font-bold tracking-widest uppercase border-b border-primary/10">
                    Most Popular
                </div>
                <CardHeader>
                    <CardTitle className="text-2xl md:text-3xl">Monthly Membership</CardTitle>
                    <CardDescription>
                        Full-service primary care. Messaging, triage, prescriptions, labs, and care navigation.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <div className="text-4xl font-bold">${MEMBERSHIP_MONTHLY_DOLLARS}<span className="text-lg font-normal text-muted-foreground">/month</span></div>
                        <p className="text-sm text-muted-foreground mt-1">No long-term commitment. Cancel anytime.</p>
                    </div>

                    <Button asChild size="lg" className="w-full text-lg h-14">
                        <Link href="/register?plan=individual&billing=monthly">Continue to Enrollment</Link>
                    </Button>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                        <div className="text-sm text-muted-foreground">
                            Adults 18+ only. Confirmed state availability required.
                        </div>
                        <Link href="/pricing" className="text-sm font-medium text-primary hover:underline">
                            Want to save with annual billing?
                        </Link>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-10 rounded-2xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                <div className="font-medium text-foreground mb-2">What happens next</div>
                <ol className="list-decimal list-inside space-y-1">
                    <li>Create your account</li>
                    <li>Confirm your state and complete intake</li>
                    <li>Complete checkout</li>
                    <li>Start messaging right away</li>
                </ol>
            </div>
        </div>
    );
}

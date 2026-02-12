import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonLd } from "@/components/seo/JsonLd";
import { MEMBERSHIP_ANNUAL_DOLLARS, MEMBERSHIP_MONTHLY_DOLLARS } from "@/lib/pricing";

export const metadata: Metadata = {
    title: "Join | Present Health",
    description: "Join Present Health in minutes. One plan: $49/month or $490/year. Messaging-first primary care for adults 18+.",
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
                    One plan. Everything included. Choose monthly or annual billing and start membership in minutes.
                </p>
            </header>

            <Card className="mt-12 border-primary/40 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-2xl md:text-3xl">Present Health Membership</CardTitle>
                    <CardDescription>
                        Full-service primary care. Messaging, video when clinically appropriate, prescriptions, labs, chronic care, and care navigation.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-border p-4">
                            <div className="text-sm text-muted-foreground">Monthly</div>
                            <div className="text-2xl font-semibold">${MEMBERSHIP_MONTHLY_DOLLARS}/month</div>
                            <div className="mt-1 min-h-4 text-xs text-muted-foreground" aria-hidden="true">
                                <span className="opacity-0 select-none">Save $98</span>
                            </div>
                            <Button asChild className="mt-3 w-full">
                                <Link href="/register?plan=individual&billing=monthly">Continue monthly</Link>
                            </Button>
                        </div>
                        <div className="rounded-xl border border-border p-4">
                            <div className="text-sm text-muted-foreground">Annual</div>
                            <div className="text-2xl font-semibold">${MEMBERSHIP_ANNUAL_DOLLARS}/year</div>
                            <div className="mt-1 min-h-4 text-xs text-muted-foreground">Save $98</div>
                            <Button asChild className="mt-3 w-full">
                                <Link href="/register?plan=individual&billing=annual">Continue annual</Link>
                            </Button>
                        </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Adults 18+ only. You will confirm state availability before payment.
                    </div>
                    <Button asChild variant="outline">
                        <Link href="/pricing">See full pricing details</Link>
                    </Button>
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

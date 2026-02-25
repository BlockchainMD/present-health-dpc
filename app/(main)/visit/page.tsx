import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
    title: "Single Visit | Present Health",
    description: "Need one visit? Present Health offers a single messaging-first primary care visit option for $99.",
};

export default function VisitPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-1 py-12 md:py-24 bg-slate-50">
                <div className="container px-4 md:px-6 mx-auto max-w-4xl">
                    <div className="text-center mb-12">
                        <CardTitle className="text-3xl tracking-tight md:text-4xl">Just need one visit? $99.</CardTitle>
                        <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
                            No membership required. Get full-service primary care for a single issue.
                        </p>
                    </div>
                    <Card className="border-border/70">
                        <CardHeader>
                            {/* The CardTitle and CardDescription are now outside the CardHeader based on the provided edit. */}
                        </CardHeader>
                        <CardContent className="space-y-6 text-sm text-muted-foreground">
                            <p>
                                A single visit includes secure messaging-first clinical support, review of your concern, and clear next
                                steps from a licensed clinician. Video can be included when clinically appropriate.
                            </p>
                            <p>
                                Adults 18+ only. For emergency symptoms, call 911 or go to your nearest emergency department.
                            </p>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Button asChild>
                                    <Link href="/join">Start Single Visit Request</Link>
                                </Button>
                            </div>
                            <div className="mt-6 text-center text-sm">
                                <Button variant="link" asChild className="text-emerald-700 hover:text-emerald-800">
                                    <Link href="/join">Prefer membership? Start at $99/mo</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}

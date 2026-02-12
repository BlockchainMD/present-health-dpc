import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
    title: "Single Visit | Present Health",
    description: "Need one visit? Present Health offers a single messaging-first primary care visit option for $49.",
};

export default function VisitPage() {
    return (
        <div className="container mx-auto max-w-4xl px-4 pt-24 pb-14 md:px-6">
            <Card className="border-border/70">
                <CardHeader>
                    <CardTitle className="text-3xl tracking-tight md:text-4xl">Single Visit Option - $49</CardTitle>
                    <CardDescription className="text-base text-muted-foreground">
                        For one-time primary care needs when you do not want a membership.
                    </CardDescription>
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
                            <Link href="/book">Request Single Visit - $49</Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/join">Prefer membership? Start at $49/mo</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

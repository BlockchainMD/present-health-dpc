"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    EMPLOYER_PER_EMPLOYEE_MONTHLY_DOLLARS,
    MEMBERSHIP_ANNUAL_DOLLARS,
    MEMBERSHIP_ANNUAL_SAVINGS_DOLLARS,
    MEMBERSHIP_MONTHLY_DOLLARS,
    SINGLE_VISIT_DOLLARS,
} from "@/lib/pricing";

const INCLUDED_SECTIONS: Array<{ title: string; items: string[] }> = [
    {
        title: "Messaging & Access",
        items: [
            "Unlimited secure messaging (text, photo, voice memo)",
            "Typical response time: within 4 business hours (M-F 8am-8pm ET)",
            "Video visits when clinically appropriate - included",
        ],
    },
    {
        title: "Prescriptions & Labs",
        items: [
            "New prescriptions and refill management",
            "Lab and imaging ordering at transparent pricing",
            "Lab result interpretation (including from other providers)",
            "Medication review and interaction checks",
        ],
    },
    {
        title: "Ongoing Care",
        items: [
            "Chronic condition management (diabetes, hypertension, thyroid, cholesterol, etc.)",
            "Annual wellness review and prevention planning",
            "Care coordination (we contact your specialists, pharmacy, insurance)",
            "Specialist referral guidance",
        ],
    },
    {
        title: "Triage & Navigation",
        items: [
            "\"Should I go to the ER?\" triage",
            "When in-person care is needed, we help coordinate it",
        ],
    },
];

const NOT_INCLUDED = [
    "Emergency care (call 911)",
    "In-person procedures or physical exams requiring hands-on evaluation",
    "Specialist visits (we refer and coordinate)",
    "Lab/imaging costs (ordered by us and billed separately by the lab/imaging provider)",
    "Not insurance",
    "Adults 18+ only",
];

export function MembershipTiers() {
    const [annual, setAnnual] = useState(false);
    const displayPrice = useMemo(
        () => (annual ? `$${MEMBERSHIP_ANNUAL_DOLLARS}/year` : `$${MEMBERSHIP_MONTHLY_DOLLARS}/month`),
        [annual]
    );

    return (
        <section aria-label="Pricing plans" className="pb-16 md:pb-20 bg-background">
            <div className="container mx-auto px-4 md:px-6 max-w-6xl">
                <div className="max-w-4xl mx-auto text-center mb-10">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">One plan. All primary care services included.</h1>
                    <p className="text-xl text-muted-foreground">
                        Primary care should not have fine print. $49/month covers care within our primary care scope - no per-visit fees, no tiers,
                        no surprises.
                    </p>
                    <div className="mt-4 rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                        <span className="font-semibold">Not insurance.</span> Present Health covers primary care and does not replace health insurance
                        for hospitalization, specialist care, surgery, or emergency services.
                    </div>
                </div>

                <div className="max-w-4xl mx-auto">
                    <Card className="border-primary/40 shadow-md">
                        <CardHeader className="space-y-3">
                            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                                <CardTitle className="text-3xl md:text-4xl">${MEMBERSHIP_MONTHLY_DOLLARS}/month</CardTitle>
                                <div className="flex items-center gap-3">
                                    <Label htmlFor="billing-toggle" className={!annual ? "font-semibold" : "text-muted-foreground"}>
                                        Monthly
                                    </Label>
                                    <Switch id="billing-toggle" checked={annual} onCheckedChange={setAnnual} />
                                    <Label htmlFor="billing-toggle" className={annual ? "font-semibold" : "text-muted-foreground"}>
                                        Annual
                                    </Label>
                                </div>
                            </div>
                            <CardDescription className="text-base text-muted-foreground">
                                {displayPrice} {annual ? `(save $${MEMBERSHIP_ANNUAL_SAVINGS_DOLLARS})` : ""}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="grid gap-6 md:grid-cols-2">
                                {INCLUDED_SECTIONS.map((section) => (
                                    <div key={section.title} className="space-y-3">
                                        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">{section.title}</h3>
                                        <ul className="space-y-2 text-sm text-muted-foreground">
                                            {section.items.map((item) => (
                                                <li key={item} className="flex items-start gap-2">
                                                    <Check className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-xl border border-border bg-muted/20 p-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground mb-3">Not Included</h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    {NOT_INCLUDED.map((item) => (
                                        <li key={item} className="flex items-start gap-2">
                                            <X className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <Button asChild size="lg" className="w-full sm:w-auto">
                                <Link href="/join">Start Membership</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="mt-6 border-border/60">
                        <CardHeader>
                            <CardTitle className="text-2xl">Just need one visit? ${SINGLE_VISIT_DOLLARS}.</CardTitle>
                            <CardDescription className="text-base">
                                No membership required. One clinical encounter for a specific health concern.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                {[
                                    "One message-based or video encounter",
                                    "Prescription if clinically appropriate",
                                    "Lab order if needed (costs separate)",
                                    "Follow-up guidance",
                                ].map((item) => (
                                    <li key={item} className="flex items-start gap-2">
                                        <Check className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-xs text-muted-foreground">
                                Want ongoing access? The membership is the same price - $49/month for unlimited care.
                            </p>
                            <Button asChild variant="outline">
                                <Link href="/visit">Get a Single Visit</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="max-w-4xl mx-auto mt-10 space-y-6">
                    <Card className="border-border/60">
                        <CardContent className="pt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="font-semibold text-foreground">
                                    Offering this to your team? ${EMPLOYER_PER_EMPLOYEE_MONTHLY_DOLLARS}/employee/month.
                                </p>
                            </div>
                            <Button asChild variant="outline">
                                <Link href="/for-employers">Learn More</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-2xl">How $49/month compares</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2 text-sm text-muted-foreground">
                            <div className="flex justify-between gap-4"><span>Urgent care visit</span><span>$150-300</span></div>
                            <div className="flex justify-between gap-4"><span>Non-emergency ER visit</span><span>$1,000-2,500</span></div>
                            <div className="flex justify-between gap-4"><span>Wait for PCP appointment</span><span>20+ days</span></div>
                            <div className="flex justify-between gap-4 font-medium text-foreground">
                                <span>Present Health</span><span>$49/month, typical responses within 4 business hours</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="text-xl">HSA-eligible starting 2026.</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            Under current IRS rules (2026), this membership is within the monthly DPC fee limit at $49/month.
                            <div className="mt-2 text-xs">
                                Subject to IRS rules. Consult a tax professional.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    );
}

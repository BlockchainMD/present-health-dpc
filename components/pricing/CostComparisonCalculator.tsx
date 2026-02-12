"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    DEFAULT_MARGINAL_TAX_RATE,
    MEMBERSHIP_MONTHLY_DOLLARS,
    type FilingStatus,
} from "@/lib/pricing";

const currency0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const currency2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

function clampNumber(value: number, min: number, max: number) {
    if (Number.isNaN(value)) return min;
    return Math.min(max, Math.max(min, value));
}

function selectClassName() {
    return "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
}

export function CostComparisonCalculator() {
    const [urgentCareVisitsAnnual, setUrgentCareVisitsAnnual] = useState<number>(3);
    const [urgentCareCostPerVisit, setUrgentCareCostPerVisit] = useState<number>(200);
    const [filingStatus, setFilingStatus] = useState<FilingStatus>("single");

    const membershipMonthly = MEMBERSHIP_MONTHLY_DOLLARS;

    const computed = useMemo(() => {
        const membershipAnnual = MEMBERSHIP_MONTHLY_DOLLARS * 12;
        const dpcAnnual = membershipAnnual;
        const urgentCareAnnual = urgentCareVisitsAnnual * urgentCareCostPerVisit;
        const difference = urgentCareAnnual - dpcAnnual;
        const breakEvenVisits = urgentCareCostPerVisit > 0 ? membershipAnnual / urgentCareCostPerVisit : 0;

        const taxRate = DEFAULT_MARGINAL_TAX_RATE[filingStatus];
        const hsaBenefit = membershipAnnual * taxRate;

        const effectiveMonthlyAfterHsa = (dpcAnnual - hsaBenefit) / 12;

        return {
            membershipAnnual,
            dpcAnnual,
            urgentCareAnnual,
            difference,
            breakEvenVisits,
            hsaBenefit,
            effectiveMonthlyAfterHsa,
        };
    }, [filingStatus, urgentCareCostPerVisit, urgentCareVisitsAnnual]);

    return (
        <section aria-label="Primary care cost comparison calculator" className="py-16 md:py-20 bg-muted/20 border-y border-border">
            <div className="container mx-auto px-4 md:px-6">
                <div className="max-w-3xl mx-auto text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Primary care cost comparison calculator</h2>
                    <p className="text-lg text-muted-foreground">
                        Compare common primary care access costs (like urgent care visits) with a Present Health membership.
                    </p>
                </div>

                <noscript>
                    <div className="max-w-4xl mx-auto mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        JavaScript is required for real-time calculator updates. Membership tiers above are still available without JavaScript.
                    </div>
                </noscript>

                <div className="max-w-6xl mx-auto mb-6 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-950">
                    <p className="font-semibold">Present Health is not insurance and does not replace health insurance coverage.</p>
                    <p className="mt-1">
                        This calculator shows primary-care cost differences only. You may still need insurance for hospitalization, specialist care,
                        emergency care, surgery, imaging, and other services outside primary care.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2 max-w-6xl mx-auto items-start">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Inputs</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-5">
                            <div className="grid gap-2">
                                <div className="flex items-baseline justify-between gap-3">
                                    <Label htmlFor="urgent-care-visits">Urgent care visits per year</Label>
                                    <div className="text-xs text-muted-foreground">0 to 12</div>
                                </div>
                                <Input
                                    id="urgent-care-visits"
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    max={12}
                                    step={1}
                                    value={urgentCareVisitsAnnual}
                                    onChange={(e) => {
                                        const next = clampNumber(Number.parseFloat(e.target.value || "0"), 0, 12);
                                        setUrgentCareVisitsAnnual(next);
                                    }}
                                />
                                <input
                                    type="range"
                                    min={0}
                                    max={12}
                                    step={1}
                                    value={urgentCareVisitsAnnual}
                                    onChange={(e) => setUrgentCareVisitsAnnual(clampNumber(Number.parseFloat(e.target.value || "0"), 0, 12))}
                                    className="w-full accent-primary"
                                    aria-label="Urgent care visits slider"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="urgent-care-cost">Average urgent care visit cost</Label>
                                <Input
                                    id="urgent-care-cost"
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    step={1}
                                    value={urgentCareCostPerVisit}
                                    onChange={(e) => {
                                        const next = clampNumber(Number.parseFloat(e.target.value || "0"), 0, 10000);
                                        setUrgentCareCostPerVisit(next);
                                    }}
                                />
                                <div className="text-xs text-muted-foreground">
                                    Typical urgent care visits often range around $150-$300 depending on location and services.
                                    This is a planning estimate, not a billed quote.
                                </div>
                            </div>

                            <div className="rounded-md border border-border bg-background px-4 py-3 text-xs text-muted-foreground">
                                Primary-care-only framing: this tool compares membership cost against common primary care access spending.
                                It does not compare comprehensive insurance benefits.
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="filing">Filing status (HSA estimate)</Label>
                                <select
                                    id="filing"
                                    className={selectClassName()}
                                    value={filingStatus}
                                    onChange={(e) => setFilingStatus(e.target.value as FilingStatus)}
                                >
                                    <option value="single">Single</option>
                                    <option value="married_filing_jointly">Married filing jointly</option>
                                </select>
                                <div className="text-xs text-muted-foreground">
                                    Uses a 22% marginal tax rate estimate for both filing statuses.
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setUrgentCareVisitsAnnual(3);
                                        setUrgentCareCostPerVisit(200);
                                        setFilingStatus("single");
                                    }}
                                >
                                    Reset
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Outputs</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-5">
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-medium text-foreground">Annual cost with Present Health</div>
                                    <div className="text-lg font-semibold">{currency0.format(computed.dpcAnnual)}</div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {currency0.format(membershipMonthly)} x 12
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-medium text-foreground">Estimated annual urgent care spend without membership</div>
                                    <div className="text-lg font-semibold">{currency0.format(computed.urgentCareAnnual)}</div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {urgentCareVisitsAnnual} visits x {currency0.format(urgentCareCostPerVisit)} per visit
                                </div>
                            </div>

                            <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-medium text-foreground">Estimated annual difference (primary care only)</div>
                                    <div
                                        className={
                                            "text-lg font-bold " +
                                            (computed.difference >= 0 ? "text-emerald-700" : "text-red-700")
                                        }
                                        aria-live="polite"
                                    >
                                        {currency0.format(computed.difference)}
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Positive means membership is estimated to cost less than this urgent-care-only scenario.
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-medium text-foreground">Break-even urgent care visits per year</div>
                                    <div className="text-lg font-semibold">{computed.breakEvenVisits.toFixed(1)}</div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    At {currency0.format(urgentCareCostPerVisit)} per visit, membership cost equals about {computed.breakEvenVisits.toFixed(1)} urgent care visits/year.
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-medium text-foreground">HSA tax benefit estimate</div>
                                    <div className="text-lg font-semibold">{currency0.format(computed.hsaBenefit)}</div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {currency0.format(computed.membershipAnnual)} membership x 22% marginal tax rate estimate
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-medium text-foreground">
                                        Effective monthly DPC cost after HSA savings
                                    </div>
                                    <div className="text-lg font-semibold">{currency2.format(computed.effectiveMonthlyAfterHsa)}</div>
                                </div>
                            </div>

                            <div className="rounded-md border-2 border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950">
                                <span className="font-semibold">Important:</span> Present Health is not insurance and does not replace insurance coverage.
                                This calculator provides estimates only and does not constitute tax, financial, or insurance advice.
                                Consult a tax professional and review your coverage needs before making insurance decisions.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    );
}

"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    DEFAULT_INSURANCE_PREMIUMS_DOLLARS,
    DEFAULT_MARGINAL_TAX_RATE,
    MEMBERSHIP_TIERS,
    normalizeCoverageType,
    type CoverageType,
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
    const [coverage, setCoverage] = useState<CoverageType>("individual");
    const [premiumMonthly, setPremiumMonthly] = useState<number>(DEFAULT_INSURANCE_PREMIUMS_DOLLARS.individual);
    const [oopAnnual, setOopAnnual] = useState<number>(2500);
    const [filingStatus, setFilingStatus] = useState<FilingStatus>("single");

    const membershipMonthly = MEMBERSHIP_TIERS[coverage].monthlyDollars;

    const computed = useMemo(() => {
        const membershipAnnual = membershipMonthly * 12;
        const dpcAnnual = membershipAnnual;

        const premiumAnnual = premiumMonthly * 12;
        const traditionalAnnual = premiumAnnual + oopAnnual;

        const savings = traditionalAnnual - dpcAnnual;

        const taxRate = DEFAULT_MARGINAL_TAX_RATE[filingStatus];
        const hsaBenefit = membershipAnnual * taxRate;

        const effectiveMonthlyAfterHsa = (dpcAnnual - hsaBenefit) / 12;

        return {
            membershipAnnual,
            dpcAnnual,
            traditionalAnnual,
            savings,
            hsaBenefit,
            effectiveMonthlyAfterHsa,
        };
    }, [filingStatus, membershipMonthly, oopAnnual, premiumMonthly]);

    return (
        <section aria-label="Cost comparison calculator" className="py-16 md:py-20 bg-muted/20 border-y border-border">
            <div className="container mx-auto px-4 md:px-6">
                <div className="max-w-3xl mx-auto text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Cost comparison calculator</h2>
                    <p className="text-lg text-muted-foreground">
                        Compare estimated annual cost of a Present Health membership vs traditional insurance costs.
                    </p>
                </div>

                <noscript>
                    <div className="max-w-4xl mx-auto mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        JavaScript is required for real-time calculator updates. Membership tiers above are still available without JavaScript.
                    </div>
                </noscript>

                <div className="grid gap-6 lg:grid-cols-2 max-w-6xl mx-auto items-start">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Inputs</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="coverage">Coverage type</Label>
                                <select
                                    id="coverage"
                                    className={selectClassName()}
                                    value={coverage}
                                    onChange={(e) => {
                                        const next = normalizeCoverageType(e.target.value);
                                        setCoverage(next);
                                        setPremiumMonthly(DEFAULT_INSURANCE_PREMIUMS_DOLLARS[next]);
                                    }}
                                >
                                    <option value="individual">Individual</option>
                                    <option value="couple">Couple</option>
                                    <option value="family">Family</option>
                                </select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="premium">Current monthly insurance premium</Label>
                                <Input
                                    id="premium"
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    step={1}
                                    value={premiumMonthly}
                                    onChange={(e) => {
                                        const next = clampNumber(Number.parseFloat(e.target.value || "0"), 0, 100000);
                                        setPremiumMonthly(next);
                                    }}
                                />
                                <div className="text-xs text-muted-foreground">
                                    Prefill uses example benchmark plan averages (individual baseline is the 2024 national average benchmark plan premium for a 40-year-old; couple/family defaults are rough household-size estimates). Source:{" "}
                                    <a
                                        href="https://www.insurance.com/health-insurance/aca-health-insurance-averages"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-primary hover:underline"
                                    >
                                        insurance.com (citing KFF)
                                    </a>
                                    .
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-baseline justify-between gap-3">
                                    <Label htmlFor="oop">Estimated annual out-of-pocket</Label>
                                    <div className="text-xs text-muted-foreground">$0 to $10,000</div>
                                </div>
                                <Input
                                    id="oop"
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    max={10000}
                                    step={50}
                                    value={oopAnnual}
                                    onChange={(e) => {
                                        const next = clampNumber(Number.parseFloat(e.target.value || "0"), 0, 10000);
                                        setOopAnnual(next);
                                    }}
                                />
                                <input
                                    type="range"
                                    min={0}
                                    max={10000}
                                    step={50}
                                    value={oopAnnual}
                                    onChange={(e) => setOopAnnual(clampNumber(Number.parseFloat(e.target.value || "0"), 0, 10000))}
                                    className="w-full accent-primary"
                                    aria-label="Out-of-pocket slider"
                                />
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
                                        setPremiumMonthly(DEFAULT_INSURANCE_PREMIUMS_DOLLARS[coverage]);
                                        setOopAnnual(2500);
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
                                    {currency0.format(membershipMonthly)} × 12
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-medium text-foreground">Annual cost with traditional insurance</div>
                                    <div className="text-lg font-semibold">{currency0.format(computed.traditionalAnnual)}</div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {currency0.format(premiumMonthly)} × 12 + {currency0.format(oopAnnual)} estimated out-of-pocket
                                </div>
                            </div>

                            <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-medium text-foreground">Estimated annual savings</div>
                                    <div
                                        className={
                                            "text-lg font-bold " +
                                            (computed.savings >= 0 ? "text-emerald-700" : "text-red-700")
                                        }
                                        aria-live="polite"
                                    >
                                        {currency0.format(computed.savings)}
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Positive means DPC is estimated to cost less than your current insurance spending.
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-medium text-foreground">HSA tax benefit estimate</div>
                                    <div className="text-lg font-semibold">{currency0.format(computed.hsaBenefit)}</div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {currency0.format(computed.membershipAnnual)} membership × 22% marginal tax rate estimate
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

                            <div className="rounded-md border border-border bg-background px-4 py-3 text-xs text-muted-foreground">
                                This calculator provides estimates only and does not constitute tax or financial advice. Consult a tax professional for your specific situation.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    );
}

"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const currency0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const currency2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

function clampNumber(value: number, min: number, max: number) {
    if (Number.isNaN(value)) return min;
    return Math.min(max, Math.max(min, value));
}

function normalizeInitial(value: unknown, fallback: number, min: number, max: number) {
    const n =
        typeof value === "number"
            ? value
            : typeof value === "string"
                ? Number.parseFloat(value)
                : NaN;
    if (!Number.isFinite(n)) return fallback;
    return clampNumber(n, min, max);
}

export function EmployerRoiCalculator({
    initialEmployees,
    initialPremiumMonthly,
    initialUtilizationAnnual,
}: {
    initialEmployees?: number | null;
    initialPremiumMonthly?: number | null;
    initialUtilizationAnnual?: number | null;
}) {
    const [employees, setEmployees] = useState<number>(() =>
        normalizeInitial(initialEmployees, 25, 5, 200)
    );
    const [premiumMonthly, setPremiumMonthly] = useState<number>(() =>
        normalizeInitial(initialPremiumMonthly, 650, 0, 100000)
    );
    const [utilizationAnnual, setUtilizationAnnual] = useState<number>(() =>
        normalizeInitial(initialUtilizationAnnual, 2000, 0, 100000)
    );

    const computed = useMemo(() => {
        const dpcAnnual = employees * 89 * 12;
        const traditionalAnnual = employees * (premiumMonthly * 12 + utilizationAnnual);
        const savingsAnnual = traditionalAnnual - dpcAnnual;
        const perEmployeeMonthlySavings = employees > 0 ? savingsAnnual / employees / 12 : 0;

        return {
            dpcAnnual,
            traditionalAnnual,
            savingsAnnual,
            perEmployeeMonthlySavings,
        };
    }, [employees, premiumMonthly, utilizationAnnual]);

    return (
        <Card className="border-border/60">
            <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <CardTitle>Employer ROI calculator</CardTitle>
                    <Badge variant="secondary">$89/employee/month</Badge>
                </div>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="grid gap-5">
                    <div className="grid gap-2">
                        <div className="flex items-baseline justify-between gap-3">
                            <Label htmlFor="employees">Number of employees</Label>
                            <div className="text-xs text-muted-foreground">5 to 200</div>
                        </div>
                        <Input
                            id="employees"
                            type="number"
                            inputMode="numeric"
                            min={5}
                            max={200}
                            step={1}
                            value={employees}
                            onChange={(e) => setEmployees(clampNumber(Number.parseInt(e.target.value || "0", 10), 5, 200))}
                        />
                        <input
                            type="range"
                            min={5}
                            max={200}
                            step={1}
                            value={employees}
                            onChange={(e) => setEmployees(clampNumber(Number.parseInt(e.target.value || "0", 10), 5, 200))}
                            className="w-full accent-primary"
                            aria-label="Employees slider"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="premium">Current average monthly insurance premium (per employee)</Label>
                        <Input
                            id="premium"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={1}
                            value={premiumMonthly}
                            onChange={(e) => setPremiumMonthly(clampNumber(Number.parseFloat(e.target.value || "0"), 0, 100000))}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="utilization">Estimated annual claims/utilization cost (per employee)</Label>
                        <Input
                            id="utilization"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={50}
                            value={utilizationAnnual}
                            onChange={(e) => setUtilizationAnnual(clampNumber(Number.parseFloat(e.target.value || "0"), 0, 100000))}
                        />
                    </div>
                </div>

                <div className="grid gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-foreground">Annual cost with Present Health</div>
                        <div className="text-lg font-semibold">{currency0.format(computed.dpcAnnual)}</div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-foreground">Annual cost with traditional insurance</div>
                        <div className="text-lg font-semibold">{currency0.format(computed.traditionalAnnual)}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-medium text-foreground">Estimated annual savings</div>
                            <div className={"text-lg font-bold " + (computed.savingsAnnual >= 0 ? "text-emerald-700" : "text-red-700")}>
                                {currency0.format(computed.savingsAnnual)}
                            </div>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                            Per-employee monthly savings: <span className="font-medium text-foreground">{currency2.format(computed.perEmployeeMonthlySavings)}</span>
                        </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Note: DPC covers primary care. Many employers pair DPC with a low-cost catastrophic plan for hospitalizations and specialists.
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

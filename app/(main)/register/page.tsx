'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
    MEMBERSHIP_ANNUAL_DOLLARS,
    MEMBERSHIP_TIERS,
    normalizeBillingCadence,
    normalizeCoverageType,
} from '@/lib/pricing';
import { US_STATES } from '@/lib/us-states';
import { trackEvent } from '@/lib/track-event';

type StateOption = { name: string; slug: string };

function RegisterForm() {
    const searchParams = useSearchParams();
    const plan = searchParams.get('plan');
    const billing = searchParams.get('billing');
    const canceled = searchParams.get('canceled');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [stateOptions, setStateOptions] = useState<StateOption[]>([]);

    const planKey = normalizeCoverageType(plan);
    const billingCadence = normalizeBillingCadence(billing);
    const planName = MEMBERSHIP_TIERS[planKey].name;
    const price = billingCadence === "annual"
        ? `$${MEMBERSHIP_ANNUAL_DOLLARS}/year`
        : `$${MEMBERSHIP_TIERS[planKey].monthlyDollars}/mo`;
    const fallbackStateOptions = useMemo(
        () => US_STATES.map((state) => ({ name: state.name, slug: state.slug })),
        []
    );

    useEffect(() => {
        let cancelled = false;

        const loadActiveStates = async () => {
            try {
                const res = await fetch("/api/public/active-states", { cache: "no-store" });
                const data = await res.json().catch(() => null);
                if (!res.ok || !data?.success || !Array.isArray(data?.states) || !data.states.length) {
                    if (!cancelled) setStateOptions(fallbackStateOptions);
                    return;
                }

                const normalized = data.states
                    .map((state: { name?: string; slug?: string }) => ({
                        name: typeof state?.name === "string" ? state.name : "",
                        slug: typeof state?.slug === "string" ? state.slug : "",
                    }))
                    .filter((state: StateOption) => state.name && state.slug)
                    .sort((a: StateOption, b: StateOption) => a.name.localeCompare(b.name));

                if (!cancelled) {
                    setStateOptions(normalized.length ? normalized : fallbackStateOptions);
                }
            } catch {
                if (!cancelled) setStateOptions(fallbackStateOptions);
            }
        };

        void loadActiveStates();

        return () => {
            cancelled = true;
        };
    }, [fallbackStateOptions]);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);
        setError("");

        const formData = new FormData(event.currentTarget);
        const firstName = formData.get("firstName") as string;
        const lastName = formData.get("lastName") as string;
        const email = formData.get("email") as string;
        const phone = formData.get("phone") as string;
        const state = formData.get("state") as string;
        trackEvent({
            eventType: "REGISTER_FORM_SUBMIT",
            path: "/register",
            metadata: { plan: planKey, state, billing: billingCadence },
        });

        try {
            const checkoutRes = await fetch("/api/membership/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    email,
                    phone,
                    state,
                    plan: planKey,
                    billing: billingCadence,
                }),
            });

            if (!checkoutRes.ok) {
                const data = await checkoutRes.json().catch(() => null);
                throw new Error(data?.message || "Failed to start checkout");
            }

            const { url } = await checkoutRes.json();
            window.location.href = url;
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to start checkout");
            setIsLoading(false);
        }
    }

    return (
        <div className="container mx-auto px-4 py-20 flex justify-center items-center min-h-[calc(100vh-80px)]">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Start membership</CardTitle>
                    <CardDescription>
                        You selected <span className="font-semibold text-primary">{planName}</span> ({price}). We&apos;ll send your account setup link after checkout.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-4">
                        {canceled && !error && (
                            <div className="p-4 text-sm rounded-md bg-amber-50 border border-amber-200 text-amber-900">
                                Checkout was canceled. Your details are still here when you are ready to continue.
                            </div>
                        )}
                        {error && (
                            <div className="p-4 text-sm rounded-md bg-red-50 border border-red-100 flex flex-col gap-2">
                                <span className="text-red-800 font-medium">{error}</span>
                                {error.toLowerCase().includes("state") && (
                                    <div className="mt-1 pt-2 border-t border-red-200">
                                        <p className="text-red-700 mb-2 italic">We haven&apos;t launched in your state yet, but we&apos;re expanding fast.</p>
                                        <Button asChild variant="outline" size="sm" className="bg-white border-red-200 text-red-700 hover:bg-red-50">
                                            <Link href="/states">Join the state waitlist</Link>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="first-name">First name</Label>
                                <Input id="first-name" name="firstName" placeholder="John" required disabled={isLoading} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last-name">Last name</Label>
                                <Input id="last-name" name="lastName" placeholder="Doe" required disabled={isLoading} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="john@example.com" required disabled={isLoading} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone number (optional)</Label>
                            <Input id="phone" name="phone" type="tel" placeholder="(555) 000-0000" disabled={isLoading} />
                            <p className="text-[10px] text-muted-foreground">Used for your welcome call with the care team.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="state">State of residence</Label>
                            <select
                                id="state"
                                name="state"
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                required
                                disabled={isLoading}
                                defaultValue=""
                            >
                                <option value="" disabled>
                                    Select your state
                                </option>
                                {(stateOptions.length ? stateOptions : fallbackStateOptions).map((state) => (
                                    <option key={state.slug} value={state.name}>
                                        {state.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            We verify your state eligibility before checkout. After payment, you&apos;ll get an email to set your password and open your dashboard.
                        </p>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Redirecting to checkout..." : "Continue to secure checkout"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                        Already a member? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RegisterForm />
        </Suspense>
    );
}

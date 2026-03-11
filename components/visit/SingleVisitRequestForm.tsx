"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { US_STATES } from "@/lib/us-states";
import { trackEvent } from "@/lib/track-event";

type StateOption = { name: string; slug: string };

type SubmitState =
    | { status: "idle" }
    | { status: "submitting" }
    | { status: "success"; message: string }
    | { status: "error"; message: string };

export function SingleVisitRequestForm() {
    const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
    const [stateOptions, setStateOptions] = useState<StateOption[]>([]);

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
        setSubmitState({ status: "submitting" });

        const form = event.currentTarget;
        const formData = new FormData(form);

        const payload = {
            firstName: String(formData.get("firstName") || "").trim(),
            lastName: String(formData.get("lastName") || "").trim(),
            email: String(formData.get("email") || "").trim(),
            phone: String(formData.get("phone") || "").trim(),
            state: String(formData.get("state") || "").trim(),
            concern: String(formData.get("concern") || "").trim(),
        };

        try {
            const res = await fetch("/api/visit-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(data?.message || "Failed to submit single-visit request.");
            }

            trackEvent({
                eventType: "LEAD_CAPTURE",
                path: "/visit",
                metadata: {
                    label: "single_visit_request",
                    state: payload.state,
                },
            });

            setSubmitState({
                status: "success",
                message:
                    data?.message ||
                    "Thanks. We received your request and will follow up by email with next steps.",
            });
            form.reset();
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Failed to submit single-visit request.";
            setSubmitState({ status: "error", message });
        }
    }

    return (
        <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <div className="mb-6">
                <h2 className="text-2xl font-semibold">Request a single visit</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    Tell us what you need help with. We will review fit, confirm state availability, and email next steps.
                </p>
            </div>

            {submitState.status === "success" ? (
                <div className="space-y-4">
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                        {submitState.message}
                    </div>
                    <Button asChild variant="outline">
                        <Link href="/join">Prefer ongoing access? See membership</Link>
                    </Button>
                </div>
            ) : (
                <form onSubmit={onSubmit} className="grid gap-4">
                    {submitState.status === "error" ? (
                        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                            {submitState.message}
                        </div>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="firstName">First name</Label>
                            <Input id="firstName" name="firstName" required disabled={submitState.status === "submitting"} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="lastName">Last name</Label>
                            <Input id="lastName" name="lastName" required disabled={submitState.status === "submitting"} />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" required disabled={submitState.status === "submitting"} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone (optional)</Label>
                            <Input id="phone" name="phone" type="tel" disabled={submitState.status === "submitting"} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="state">State of residence</Label>
                        <select
                            id="state"
                            name="state"
                            required
                            defaultValue=""
                            disabled={submitState.status === "submitting"}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

                    <div className="grid gap-2">
                        <Label htmlFor="concern">What do you need help with?</Label>
                        <Textarea
                            id="concern"
                            name="concern"
                            rows={4}
                            required
                            disabled={submitState.status === "submitting"}
                            placeholder="Example: UTI symptoms, sinus infection, medication question, thyroid follow-up, rash, etc."
                        />
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Adults 18+ only. We do not use this form for emergencies. If you have emergency symptoms, call 911.
                    </p>

                    <Button type="submit" disabled={submitState.status === "submitting"}>
                        {submitState.status === "submitting" ? "Submitting..." : "Submit single-visit request"}
                    </Button>
                </form>
            )}
        </div>
    );
}

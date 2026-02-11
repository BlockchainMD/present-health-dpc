"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SubmitState =
    | { status: "idle" }
    | { status: "submitting" }
    | { status: "success" }
    | { status: "error"; message: string };

export function EmployerInquiryForm() {
    const [state, setState] = useState<SubmitState>({ status: "idle" });

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setState({ status: "submitting" });

        const form = event.currentTarget;
        const formData = new FormData(form);

        const payload = {
            companyName: String(formData.get("companyName") || "").trim(),
            contactName: String(formData.get("contactName") || "").trim(),
            email: String(formData.get("email") || "").trim(),
            phone: String(formData.get("phone") || "").trim(),
            employeeCountRange: String(formData.get("employeeCountRange") || "").trim(),
            message: String(formData.get("message") || "").trim(),
        };

        try {
            const res = await fetch("/api/employer-inquiries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                const message = data?.error || "Failed to submit inquiry.";
                throw new Error(message);
            }

            setState({ status: "success" });
            form.reset();
        } catch (error: any) {
            setState({ status: "error", message: error?.message || "Failed to submit inquiry." });
        }
    }

    return (
        <Card className="border-border/60">
            <CardHeader>
                <CardTitle>Employer inquiry</CardTitle>
                <CardDescription>
                    Tell us a bit about your team. We will respond by email within 1-2 business days.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {state.status === "success" && (
                    <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                        Thanks, your message was submitted.
                    </div>
                )}
                {state.status === "error" && (
                    <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                        {state.message}
                    </div>
                )}

                <form onSubmit={onSubmit} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="companyName">Company name</Label>
                        <Input
                            id="companyName"
                            name="companyName"
                            required
                            disabled={state.status === "submitting"}
                            placeholder="Acme, Inc."
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="contactName">Contact name</Label>
                            <Input
                                id="contactName"
                                name="contactName"
                                required
                                disabled={state.status === "submitting"}
                                placeholder="Jane Doe"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                disabled={state.status === "submitting"}
                                placeholder="jane@acme.com"
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone (optional)</Label>
                            <Input
                                id="phone"
                                name="phone"
                                disabled={state.status === "submitting"}
                                placeholder="(555) 123-4567"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="employeeCountRange">Employee count</Label>
                            <select
                                id="employeeCountRange"
                                name="employeeCountRange"
                                disabled={state.status === "submitting"}
                                required
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Select…</option>
                                <option value="5-10">5-10</option>
                                <option value="11-25">11-25</option>
                                <option value="26-50">26-50</option>
                                <option value="51-100">51-100</option>
                                <option value="100+">100+</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="message">Message (optional)</Label>
                        <Textarea
                            id="message"
                            name="message"
                            rows={5}
                            disabled={state.status === "submitting"}
                            placeholder="What are you looking for (coverage, onboarding, pricing, states, timeline)?"
                        />
                    </div>

                    <Button type="submit" disabled={state.status === "submitting"}>
                        {state.status === "submitting" ? "Submitting..." : "Submit inquiry"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

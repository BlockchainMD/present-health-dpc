"use client";

import { useState } from "react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

type FormData = {
    hasInsurance: boolean | null;
    planName: string;
    memberId: string;
    firstName: string;
    lastName: string;
    dob: string;
    state: string;
    phone: string;
    email: string;
    visitReason: string;
};

export default function BookPage() {
    const [step, setStep] = useState<"insurance" | "info" | "reason" | "confirmation">("insurance");
    const [formData, setFormData] = useState<FormData>({
        hasInsurance: null,
        planName: "",
        memberId: "",
        firstName: "",
        lastName: "",
        dob: "",
        state: "",
        phone: "",
        email: "",
        visitReason: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (step === "insurance") {
            setStep("info");
        } else if (step === "info") {
            setStep("reason");
        } else if (step === "reason") {
            setStep("confirmation");
        }
    };

    const visitReasons = [
        "Blood pressure management",
        "Diabetes and A1C management",
        "Weight management",
        "Thyroid management",
        "Cholesterol and heart health",
        "General primary care",
        "Acute/sick visit",
        "Other",
    ];

    const states = [
        "Michigan",
        "Arizona",
        "Florida",
        "Indiana",
        "Kentucky",
        "Minnesota",
        "North Carolina",
        "Nebraska",
        "New Hampshire",
        "Ohio",
        "Rhode Island",
        "Texas",
        "Utah",
        "Washington",
        "Wisconsin",
    ];

    return (
        <div className="min-h-screen bg-background py-24">
            <div className="container mx-auto px-4 md:px-6 max-w-2xl">
                <div className="mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Book a Visit</h1>
                    <p className="text-lg text-muted-foreground">
                        Schedule your video visit with a board-certified physician.
                    </p>
                </div>

                {/* Step Indicator */}
                <div className="mb-8 flex gap-2">
                    <Badge variant={step === "insurance" || ["info", "reason", "confirmation"].includes(step) ? "default" : "outline"}>
                        1. Insurance
                    </Badge>
                    <Badge variant={step === "info" || ["reason", "confirmation"].includes(step) ? "default" : "outline"}>
                        2. Your Info
                    </Badge>
                    <Badge variant={step === "reason" || step === "confirmation" ? "default" : "outline"}>
                        3. Reason
                    </Badge>
                    <Badge variant={step === "confirmation" ? "default" : "outline"}>
                        4. Confirm
                    </Badge>
                </div>

                {step === "confirmation" ? (
                    /* Confirmation Message */
                    <Card className="border-border/70">
                        <CardContent className="pt-12 pb-12 text-center">
                            <div className="flex justify-center mb-6">
                                <CheckCircle2 className="h-16 w-16 text-emerald-600" />
                            </div>
                            <h2 className="text-3xl font-bold mb-4">Thank you!</h2>
                            <p className="text-lg text-muted-foreground mb-6">
                                We've received your booking request. We'll contact you within 1 business day to confirm your appointment and answer any questions.
                            </p>
                            <p className="text-muted-foreground mb-8">
                                <span className="font-semibold">Booking details:</span>
                                <br />
                                {formData.firstName} {formData.lastName}
                                <br />
                                {formData.email} | {formData.phone}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Look for a confirmation email shortly. If you have questions, reply to the email or contact us at hello@presenthealthmd.com.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {step === "insurance" && (
                            <Card className="border-border/70">
                                <CardHeader>
                                    <CardTitle>Do you have insurance?</CardTitle>
                                    <CardDescription>
                                        We accept most major commercial plans. No insurance? Visits start at $29.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, hasInsurance: true })}
                                            className={`p-4 border-2 rounded-lg text-left transition-all ${
                                                formData.hasInsurance === true
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border hover:border-muted-foreground/50"
                                            }`}
                                        >
                                            <div className="font-semibold">Yes, I have insurance</div>
                                            <div className="text-sm text-muted-foreground">We'll verify your coverage</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, hasInsurance: false })}
                                            className={`p-4 border-2 rounded-lg text-left transition-all ${
                                                formData.hasInsurance === false
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border hover:border-muted-foreground/50"
                                            }`}
                                        >
                                            <div className="font-semibold">No insurance</div>
                                            <div className="text-sm text-muted-foreground">$29 per visit</div>
                                        </button>
                                    </div>

                                    {formData.hasInsurance === true && (
                                        <div className="space-y-3 pt-4 border-t">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Insurance Plan Name</label>
                                                <input
                                                    type="text"
                                                    value={formData.planName}
                                                    onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                                                    placeholder="e.g., Blue Cross Blue Shield"
                                                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Member ID</label>
                                                <input
                                                    type="text"
                                                    value={formData.memberId}
                                                    onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                                                    placeholder="Your member ID"
                                                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <Button type="submit" size="lg" className="w-full" disabled={formData.hasInsurance === null}>
                                        Continue
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {step === "info" && (
                            <Card className="border-border/70">
                                <CardHeader>
                                    <CardTitle>Your Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">First Name</label>
                                            <input
                                                type="text"
                                                value={formData.firstName}
                                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                                placeholder="First name"
                                                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Last Name</label>
                                            <input
                                                type="text"
                                                value={formData.lastName}
                                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                                placeholder="Last name"
                                                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Date of Birth</label>
                                        <input
                                            type="date"
                                            value={formData.dob}
                                            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">State</label>
                                        <select
                                            value={formData.state}
                                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="">Select a state</option>
                                            {states.map((st) => (
                                                <option key={st} value={st}>
                                                    {st}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Phone</label>
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder="(555) 000-0000"
                                                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Email</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="you@example.com"
                                                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setStep("insurance")}>
                                            Back
                                        </Button>
                                        <Button
                                            type="submit"
                                            size="lg"
                                            className="flex-1"
                                            disabled={!formData.firstName || !formData.lastName || !formData.dob || !formData.state || !formData.phone || !formData.email}
                                        >
                                            Continue
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {step === "reason" && (
                            <Card className="border-border/70">
                                <CardHeader>
                                    <CardTitle>What's the reason for your visit?</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-2">
                                        {visitReasons.map((reason) => (
                                            <button
                                                key={reason}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, visitReason: reason })}
                                                className={`p-3 border-2 rounded-lg text-left transition-all ${
                                                    formData.visitReason === reason
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:border-muted-foreground/50"
                                                }`}
                                            >
                                                {reason}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setStep("info")}>
                                            Back
                                        </Button>
                                        <Button type="submit" size="lg" className="flex-1" disabled={!formData.visitReason}>
                                            Continue
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}

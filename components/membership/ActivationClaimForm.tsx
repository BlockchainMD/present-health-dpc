"use client";

import { useState } from "react";

import Link from "next/link";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
    sessionId?: string;
    token?: string;
};

export function ActivationClaimForm({ sessionId = "", token = "" }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);
        setError("");

        const formData = new FormData(event.currentTarget);
        const password = String(formData.get("password") || "");
        const confirmPassword = String(formData.get("confirmPassword") || "");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/membership/activate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password, sessionId, token }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(data?.message || "Failed to activate account.");
            }

            const email = String(data?.email || "").trim().toLowerCase();
            if (!email) {
                window.location.href = "/login";
                return;
            }

            const signInRes = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (signInRes?.error) {
                window.location.href = "/login";
                return;
            }

            window.location.href = "/dashboard?success=true";
        } catch (submitError: unknown) {
            setError(submitError instanceof Error ? submitError.message : "Failed to activate account.");
            setIsLoading(false);
        }
    }

    if (!sessionId && !token) {
        return (
            <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Check your email for the activation link</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    Your payment can still be complete even if this page does not have the right session details. Use the link in
                    your welcome email or <Link href="/login" className="text-primary underline">sign in here</Link> if your account is already active.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">Create your member password</h2>
            <p className="mt-2 text-sm text-muted-foreground">
                Your membership payment is complete. Set your password to access the member dashboard.
            </p>

            <form onSubmit={onSubmit} className="mt-6 grid gap-4">
                {error ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                        {error}
                    </div>
                ) : null}

                <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" type="password" minLength={8} required disabled={isLoading} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required disabled={isLoading} />
                </div>

                <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create account and continue"}
                </Button>
            </form>
        </div>
    );
}

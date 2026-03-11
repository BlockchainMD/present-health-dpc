"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SubmitState =
    | { status: "idle" }
    | { status: "submitting" }
    | { status: "success"; message: string }
    | { status: "error"; message: string };

export default function SetupAccountPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const sessionId = searchParams.get("session_id");
    const checkout = searchParams.get("checkout");
    const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!token && !sessionId) {
            setSubmitState({ status: "error", message: "Missing account setup token." });
            return;
        }

        const formData = new FormData(event.currentTarget);
        const password = String(formData.get("password") || "");
        const confirmPassword = String(formData.get("confirmPassword") || "");

        if (password !== confirmPassword) {
            setSubmitState({ status: "error", message: "Passwords do not match." });
            return;
        }

        setSubmitState({ status: "submitting" });

        try {
            const res = await fetch("/api/account/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, sessionId, password }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(data?.message || "Failed to set password.");
            }

            const signInRes = await signIn("credentials", {
                email: data?.email,
                password,
                redirect: false,
            });
            if (signInRes?.error) {
                setSubmitState({
                    status: "success",
                    message: "Password set successfully. Sign in to open your dashboard.",
                });
                return;
            }

            setSubmitState({
                status: "success",
                message: "Password set successfully. Opening your dashboard...",
            });
            router.push("/dashboard");
            router.refresh();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to set password.";
            setSubmitState({ status: "error", message });
        }
    }

    return (
        <div className="container mx-auto px-4 py-20 flex justify-center items-center min-h-[calc(100vh-80px)]">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Finish account setup</CardTitle>
                    <CardDescription>
                        {token || sessionId
                            ? "Set your password to open your Present Health dashboard."
                            : "Your membership checkout is complete. Check your email for the account setup link."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!token && !sessionId ? (
                        <div className="space-y-4 text-sm text-muted-foreground">
                            {checkout === "success" ? (
                                <p>
                                    We sent an account setup email as soon as your payment finished. Use that link to create your password and open your dashboard.
                                </p>
                            ) : (
                                <p>Open the account setup link from your email to create your password.</p>
                            )}
                            <p>If you do not see it, check spam or contact care@presenthealthmd.com.</p>
                        </div>
                    ) : submitState.status === "success" ? (
                        <div className="space-y-4">
                            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                                {submitState.message}
                            </div>
                            <Button asChild variant="outline">
                                <Link href="/login">Go to sign in</Link>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={onSubmit} className="space-y-4">
                            {submitState.status === "error" ? (
                                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                                    {submitState.message}
                                </div>
                            ) : null}
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input id="password" name="password" type="password" minLength={8} required disabled={submitState.status === "submitting"} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm password</Label>
                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    minLength={8}
                                    required
                                    disabled={submitState.status === "submitting"}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={submitState.status === "submitting"}>
                                {submitState.status === "submitting" ? "Saving password..." : "Set password and open dashboard"}
                            </Button>
                        </form>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                        Already have access? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}

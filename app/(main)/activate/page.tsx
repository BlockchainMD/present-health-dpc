"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SubmitState =
    | { status: "idle" }
    | { status: "submitting" }
    | { status: "success"; message: string }
    | { status: "error"; message: string };

function ActivatePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const sessionId = searchParams.get("session_id");
    const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const password = String(formData.get("password") || "");
        const confirmPassword = String(formData.get("confirmPassword") || "");

        if (password !== confirmPassword) {
            setSubmitState({ status: "error", message: "Passwords do not match." });
            return;
        }

        setSubmitState({ status: "submitting" });

        try {
            const res = await fetch("/api/membership/activate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    password,
                    token,
                    sessionId,
                }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(data?.message || "Failed to activate account.");
            }

            const signInRes = await signIn("credentials", {
                email: data?.email,
                password,
                redirect: false,
            });
            if (signInRes?.error) {
                setSubmitState({
                    status: "success",
                    message: "Password created successfully. Sign in to open your dashboard.",
                });
                return;
            }

            setSubmitState({
                status: "success",
                message: "Account activated. Opening your dashboard...",
            });
            router.push("/dashboard");
            router.refresh();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to activate account.";
            setSubmitState({ status: "error", message });
        }
    }

    const canActivate = Boolean(token || sessionId);

    return (
        <div className="container mx-auto px-4 py-20 flex justify-center items-center min-h-[calc(100vh-80px)]">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Activate your account</CardTitle>
                    <CardDescription>
                        {canActivate
                            ? "Set your password to open your Present Health dashboard."
                            : "Open the activation link from your email to finish setting up your membership."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!canActivate ? (
                        <div className="space-y-4 text-sm text-muted-foreground">
                            <p>We send the activation link after checkout completes. If you do not see it, check spam or contact care@presenthealthmd.com.</p>
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
                                {submitState.status === "submitting" ? "Activating..." : "Set password and open dashboard"}
                            </Button>
                        </form>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                        Already activated? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function ActivatePage() {
    return (
        <Suspense fallback={<div className="container mx-auto px-4 py-20">Loading...</div>}>
            <ActivatePageContent />
        </Suspense>
    );
}

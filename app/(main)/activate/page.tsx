import type { Metadata } from "next";

import { ActivationClaimForm } from "@/components/membership/ActivationClaimForm";

export const metadata: Metadata = {
    title: "Activate Membership | Present Health",
    description: "Create your Present Health password after checkout so you can access your member dashboard.",
};

type SearchParams = {
    session_id?: string;
    token?: string;
};

export default async function ActivatePage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const params = await searchParams;
    const sessionId = typeof params?.session_id === "string" ? params.session_id : "";
    const token = typeof params?.token === "string" ? params.token : "";

    return (
        <div className="min-h-screen bg-slate-50 py-16 md:py-24">
            <div className="container mx-auto max-w-3xl px-4 md:px-6">
                <div className="mb-10 max-w-2xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Member activation</p>
                    <h1 className="mt-3 text-4xl font-bold tracking-tight">Finish setting up your account.</h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Payment comes first. Your password comes second. Once you set it, you can go straight into the Present Health member dashboard.
                    </p>
                </div>

                <ActivationClaimForm sessionId={sessionId} token={token} />
            </div>
        </div>
    );
}

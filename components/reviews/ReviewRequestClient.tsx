"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ReviewPlatform = "GOOGLE" | "YELP" | "HEALTHGRADES" | "ZOCDOC" | "FACEBOOK" | "OTHER";

type ReviewRequestConfig = {
    googleUrl: string;
    yelpUrl: string;
    healthgradesUrl: string;
    zocdocUrl: string;
    facebookUrl: string;
    otherLabel: string;
    otherUrl: string;
};

export function ReviewRequestClient({
    token,
    config,
}: {
    token: string;
    config: ReviewRequestConfig;
}) {
    const [loadingPlatform, setLoadingPlatform] = useState<ReviewPlatform | null>(null);
    const [error, setError] = useState<string | null>(null);

    const options = useMemo(() => {
        const rows: Array<{ platform: ReviewPlatform; label: string; url: string }> = [];
        if (config.googleUrl) rows.push({ platform: "GOOGLE", label: "Google", url: config.googleUrl });
        if (config.yelpUrl) rows.push({ platform: "YELP", label: "Yelp", url: config.yelpUrl });
        if (config.healthgradesUrl) rows.push({ platform: "HEALTHGRADES", label: "Healthgrades", url: config.healthgradesUrl });
        if (config.zocdocUrl) rows.push({ platform: "ZOCDOC", label: "Zocdoc", url: config.zocdocUrl });
        if (config.facebookUrl) rows.push({ platform: "FACEBOOK", label: "Facebook", url: config.facebookUrl });
        if (config.otherUrl) rows.push({ platform: "OTHER", label: config.otherLabel || "Other", url: config.otherUrl });
        return rows;
    }, [config]);

    async function handleSelect(platform: ReviewPlatform, fallbackUrl: string) {
        setLoadingPlatform(platform);
        setError(null);
        try {
            const res = await fetch("/api/review-request/click", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, platform }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Unable to open review destination");
            }

            const destinationUrl = String(data.destinationUrl || fallbackUrl || "").trim();
            if (!destinationUrl) {
                throw new Error("No destination URL configured for this platform yet.");
            }

            window.location.href = destinationUrl;
        } catch (e: any) {
            setError(e?.message || "Unable to open review destination");
            setLoadingPlatform(null);
        }
    }

    return (
        <div className="container px-4 md:px-6 mx-auto py-24 max-w-3xl">
            <Card className="border-border/60">
                <CardHeader>
                    <CardTitle className="text-3xl">How was your visit?</CardTitle>
                    <CardDescription>
                        We would appreciate your feedback. Choose a platform below to leave a public review.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error ? (
                        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
                    ) : null}

                    {options.length ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {options.map((option) => (
                                <Button
                                    key={option.platform}
                                    size="lg"
                                    variant="outline"
                                    disabled={loadingPlatform !== null}
                                    onClick={() => void handleSelect(option.platform, option.url)}
                                >
                                    {loadingPlatform === option.platform ? "Opening..." : `Leave a review on ${option.label}`}
                                </Button>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                            Review destinations are being configured. Please check back shortly.
                        </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                        We cannot discuss personal health information in public responses. If you need direct support,
                        contact our team through official channels.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

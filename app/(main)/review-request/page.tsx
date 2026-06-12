import type { Metadata } from "next";

import { ReviewRequestClient } from "@/components/reviews/ReviewRequestClient";
import { prisma } from "@/lib/prisma";
import { ensureDefaultReviewRequestLink, getReviewRequestConfig } from "@/lib/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Leave a Review | Present Health",
    description: "Share your feedback about Present Health on your preferred review platform.",
};

type SearchParams = Promise<{ token?: string | string[] }>;

function parseToken(value: string | string[] | undefined) {
    if (Array.isArray(value)) return String(value[0] || "").trim();
    return String(value || "").trim();
}

export default async function ReviewRequestPage({ searchParams }: { searchParams: SearchParams }) {
    const params = await searchParams;
    const requestedToken = parseToken(params?.token);

    const [config, fallbackLink, maybeRequestedLink] = await Promise.all([
        getReviewRequestConfig(),
        ensureDefaultReviewRequestLink(),
        requestedToken
            ? prisma.reviewRequestLink.findFirst({ where: { token: requestedToken, isActive: true } })
            : Promise.resolve(null),
    ]);

    const activeToken = maybeRequestedLink?.token || fallbackLink.token;

    return <ReviewRequestClient token={activeToken} config={config} />;
}

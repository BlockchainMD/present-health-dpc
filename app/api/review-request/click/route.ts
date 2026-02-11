import { NextRequest, NextResponse } from "next/server";

import {
    getReviewRequestConfig,
    parseReviewPlatform,
    recordReviewRequestClick,
} from "@/lib/reviews";

export const runtime = "nodejs";

function destinationForPlatform(config: Awaited<ReturnType<typeof getReviewRequestConfig>>, platformRaw: string) {
    const platform = parseReviewPlatform(platformRaw);
    if (platform === "GOOGLE") return config.googleUrl;
    if (platform === "YELP") return config.yelpUrl;
    if (platform === "HEALTHGRADES") return config.healthgradesUrl;
    if (platform === "ZOCDOC") return config.zocdocUrl;
    if (platform === "FACEBOOK") return config.facebookUrl;
    return config.otherUrl;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
        }

        const payload = body as Record<string, unknown>;
        const token = String(payload.token || "").trim();
        const platformRaw = String(payload.platform || "").trim();

        if (!token) {
            return NextResponse.json({ success: false, error: "token is required" }, { status: 400 });
        }
        if (!platformRaw) {
            return NextResponse.json({ success: false, error: "platform is required" }, { status: 400 });
        }

        const platform = parseReviewPlatform(platformRaw);
        const config = await getReviewRequestConfig();

        await recordReviewRequestClick({
            token,
            platform,
            referrer: request.headers.get("referer"),
            userAgent: request.headers.get("user-agent"),
        });

        const destinationUrl = destinationForPlatform(config, platformRaw);
        return NextResponse.json({ success: true, destinationUrl: destinationUrl || null });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to track review request click" },
            { status: 400 }
        );
    }
}

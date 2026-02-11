import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { getReviewRequestConfig, upsertReviewRequestConfig } from "@/lib/reviews";

export const runtime = "nodejs";

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const config = await getReviewRequestConfig();
        return NextResponse.json({ success: true, config });
    } catch (error) {
        console.error("[AdminReviewRequestConfigAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load review request config" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
        }

        const payload = body as Record<string, unknown>;
        const config = await upsertReviewRequestConfig({
            googleUrl: payload.googleUrl === undefined ? undefined : String(payload.googleUrl || ""),
            yelpUrl: payload.yelpUrl === undefined ? undefined : String(payload.yelpUrl || ""),
            healthgradesUrl: payload.healthgradesUrl === undefined ? undefined : String(payload.healthgradesUrl || ""),
            zocdocUrl: payload.zocdocUrl === undefined ? undefined : String(payload.zocdocUrl || ""),
            facebookUrl: payload.facebookUrl === undefined ? undefined : String(payload.facebookUrl || ""),
            otherLabel: payload.otherLabel === undefined ? undefined : String(payload.otherLabel || ""),
            otherUrl: payload.otherUrl === undefined ? undefined : String(payload.otherUrl || ""),
        });

        return NextResponse.json({ success: true, config });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to save review request config" },
            { status: 400 }
        );
    }
}

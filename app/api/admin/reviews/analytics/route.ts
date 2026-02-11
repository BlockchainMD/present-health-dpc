import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { getReviewAnalytics } from "@/lib/reviews";

export const runtime = "nodejs";

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const analytics = await getReviewAnalytics();
        return NextResponse.json({ success: true, analytics });
    } catch (error) {
        console.error("[AdminReviewsAnalyticsAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load review analytics" }, { status: 500 });
    }
}

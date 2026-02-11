import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { disconnectGoogleAnalyticsIntegration } from "@/lib/analytics-dashboard";

export const runtime = "nodejs";

export async function POST() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        await disconnectGoogleAnalyticsIntegration();
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to disconnect analytics integration" },
            { status: 500 }
        );
    }
}

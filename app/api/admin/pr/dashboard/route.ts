import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { getPrDashboard } from "@/lib/pr";

export const runtime = "nodejs";

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const dashboard = await getPrDashboard();
        return NextResponse.json({ success: true, dashboard });
    } catch (error) {
        console.error("[AdminPrDashboardAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load PR dashboard" }, { status: 500 });
    }
}

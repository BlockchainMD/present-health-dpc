import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { getEmployerPipelineDashboard } from "@/lib/employer-crm";

export const runtime = "nodejs";

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const dashboard = await getEmployerPipelineDashboard();
        return NextResponse.json({ success: true, dashboard });
    } catch (error) {
        console.error("[AdminEmployerCrmDashboardAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load dashboard" }, { status: 500 });
    }
}

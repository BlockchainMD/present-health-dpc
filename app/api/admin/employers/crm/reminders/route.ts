import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { clampInt, getEmployerFollowUpReminderSummary } from "@/lib/employer-crm";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const limit = clampInt(searchParams.get("limit"), 8, 1, 50);
        const summary = await getEmployerFollowUpReminderSummary(limit);

        return NextResponse.json({ success: true, ...summary });
    } catch (error) {
        console.error("[AdminEmployerCrmRemindersAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load reminders" }, { status: 500 });
    }
}

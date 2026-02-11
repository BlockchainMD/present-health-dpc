import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { sendStaleLeadAlerts } from "@/lib/unified-leads";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => null);
        const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
        const force = Boolean(payload.force);
        const limit =
            typeof payload.limit === "number" || typeof payload.limit === "string"
                ? Number(payload.limit)
                : undefined;

        const result = await sendStaleLeadAlerts({ force, limit });
        return NextResponse.json({ success: true, result });
    } catch (error) {
        console.error("[AdminUnifiedLeadStaleAlertAPI] POST error:", error);
        return NextResponse.json({ success: false, error: "Failed to send stale lead alerts" }, { status: 500 });
    }
}


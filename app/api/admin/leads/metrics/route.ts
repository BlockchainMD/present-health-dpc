import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { getUnifiedLeadMetrics, parseUnifiedLeadFilters, syncUnifiedLeadsFromSources } from "@/lib/unified-leads";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters = parseUnifiedLeadFilters(searchParams);
    const sync = searchParams.get("sync") === "1";

    try {
        const syncResult = sync
            ? await syncUnifiedLeadsFromSources({ sendNotifications: true, limitPerSource: 2000 })
            : null;

        const metrics = await getUnifiedLeadMetrics(filters);
        return NextResponse.json({ success: true, metrics, syncResult });
    } catch (error) {
        console.error("[AdminUnifiedLeadMetricsAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to compute lead metrics" }, { status: 500 });
    }
}


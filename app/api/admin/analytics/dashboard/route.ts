import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import {
    getAnalyticsDashboardData,
    listStateFilterOptions,
    syncAnalyticsCache,
} from "@/lib/analytics-dashboard";

export const runtime = "nodejs";

function parseBooleanLike(value: string | null, fallback = false) {
    if (value === null || value === undefined) return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return fallback;
    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const from = searchParams.get("from") || undefined;
        const to = searchParams.get("to") || undefined;
        const stateFilter = searchParams.get("state") || searchParams.get("stateFilter") || undefined;
        const compare = parseBooleanLike(searchParams.get("compare"), true);
        const refresh = parseBooleanLike(searchParams.get("refresh"), false);

        if (refresh) {
            await syncAnalyticsCache({ from, to });
        }

        const dashboard = await getAnalyticsDashboardData({
            from,
            to,
            compare,
            stateFilter,
        });

        return NextResponse.json({
            success: true,
            dashboard,
            stateOptions: listStateFilterOptions(),
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to load analytics dashboard" },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { getContentRefreshDashboard } from "@/lib/content-refresh";

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
        const autoDetectIfStale = parseBooleanLike(searchParams.get("autoDetectIfStale"), true);

        const dashboard = await getContentRefreshDashboard({ autoDetectIfStale });

        return NextResponse.json({
            success: true,
            dashboard,
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                success: false,
                error: error?.message || "Failed to load content refresh dashboard",
            },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from "next/server";

import { recordNativePageView } from "@/lib/analytics-dashboard";

export const runtime = "nodejs";

function pickPath(request: NextRequest, body: Record<string, unknown> | null) {
    const explicit =
        (typeof body?.path === "string" && body.path) ||
        (typeof body?.pathname === "string" && body.pathname) ||
        "";

    if (explicit.trim()) return explicit.trim();

    const referer = request.headers.get("referer") || "";
    if (referer) {
        try {
            return new URL(referer).pathname;
        } catch {
            // ignore malformed referer
        }
    }

    return "";
}

export async function POST(request: NextRequest) {
    try {
        const ua = (request.headers.get("user-agent") || "").toLowerCase();
        if (/bot|spider|crawl|slurp|bingpreview/i.test(ua)) {
            return NextResponse.json({ success: true, skipped: true, reason: "bot" });
        }

        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        const path = pickPath(request, body);
        if (!path) {
            return NextResponse.json({ success: false, error: "path is required" }, { status: 400 });
        }

        const result = await recordNativePageView(path);
        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to track pageview" },
            { status: 500 }
        );
    }
}

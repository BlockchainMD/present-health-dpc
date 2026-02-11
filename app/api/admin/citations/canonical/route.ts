import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { getCanonicalNapSettings, upsertCanonicalNapSettings } from "@/lib/citations";

export const runtime = "nodejs";

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const canonical = await getCanonicalNapSettings();
        return NextResponse.json({ success: true, canonical });
    } catch (error) {
        console.error("[AdminCitationCanonicalAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load canonical settings" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
        }

        const canonical = await upsertCanonicalNapSettings(body as Record<string, unknown>);
        return NextResponse.json({ success: true, canonical });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to save canonical settings" },
            { status: 400 }
        );
    }
}

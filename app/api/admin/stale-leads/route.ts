import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { sendStaleLeadAlerts } from "@/lib/unified-leads";

export const runtime = "nodejs";

function clampInt(value: unknown, fallback: number, min: number, max: number) {
    const parsed =
        typeof value === "number"
            ? value
            : typeof value === "string"
                ? Number.parseInt(value, 10)
                : NaN;
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

async function verifyCronAuth(request: NextRequest) {
    // Accept dedicated secret, falling back to the content engine secret
    const secret =
        process.env.STALE_LEADS_CRON_SECRET ||
        process.env.CONTENT_ENGINE_CRON_SECRET;
    if (secret) {
        const header = request.headers.get("x-cron-secret");
        const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
        if (header === secret || bearer === secret) return true;
    }

    try {
        await requireAdmin();
        return true;
    } catch {
        return false;
    }
}

export async function POST(request: NextRequest) {
    const authorized = await verifyCronAuth(request);
    if (!authorized) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const limit = clampInt(body.limit, 100, 1, 500);
        const result = await sendStaleLeadAlerts({ limit });
        return NextResponse.json({ ...result, success: true });
    } catch (error) {
        console.error("[AdminStaleLeadsAPI] POST error:", error);
        return NextResponse.json({ success: false, error: "Failed to process stale lead alerts" }, { status: 500 });
    }
}

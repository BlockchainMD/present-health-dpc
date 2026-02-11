import { NextRequest, NextResponse } from "next/server";
import type { AutoResponseSource, AutoResponseStatus } from "@prisma/client";

import { requireAdmin } from "@/lib/authz";
import {
    AUTO_RESPONSE_SOURCES,
    AUTO_RESPONSE_STATUS_LABELS,
    listAutoResponseLogs,
} from "@/lib/auto-response";

export const runtime = "nodejs";

const STATUS_VALUES = new Set(Object.keys(AUTO_RESPONSE_STATUS_LABELS));

function isAutoResponseSource(value: string): value is AutoResponseSource {
    return AUTO_RESPONSE_SOURCES.includes(value as AutoResponseSource);
}

function isAutoResponseStatus(value: string): value is AutoResponseStatus {
    return STATUS_VALUES.has(value);
}

function clampInt(value: string | null, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(String(value || ""), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
}

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const searchParams = new URL(request.url).searchParams;
        const sourceRaw = String(searchParams.get("source") || "ALL").trim().toUpperCase();
        const statusRaw = String(searchParams.get("status") || "ALL").trim().toUpperCase();
        const limit = clampInt(searchParams.get("limit"), 100, 1, 500);

        const source = isAutoResponseSource(sourceRaw) ? sourceRaw : "ALL";
        const status = isAutoResponseStatus(statusRaw) ? statusRaw : "ALL";

        const logs = await listAutoResponseLogs({ source, status, limit });

        return NextResponse.json({ success: true, logs });
    } catch (error) {
        console.error("[AdminAutoResponseLogAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load auto-response logs" }, { status: 500 });
    }
}

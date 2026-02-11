import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { syncAnalyticsCache } from "@/lib/analytics-dashboard";

export const runtime = "nodejs";

function parseBooleanLike(value: unknown, fallback = false) {
    if (value === undefined || value === null) return fallback;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
    }
    return fallback;
}

function parseOptionalDate(value: unknown) {
    const raw = String(value || "").trim();
    if (!raw) return undefined;
    const parsed = new Date(raw);
    if (!Number.isFinite(parsed.getTime())) return undefined;
    return parsed;
}

function parseOptionalDays(value: unknown) {
    const n = Number(value);
    if (!Number.isFinite(n)) return undefined;
    const days = Math.trunc(n);
    if (days <= 0) return undefined;
    return Math.max(1, Math.min(365, days));
}

async function verifyAnalyticsAuth(request: NextRequest) {
    const secret =
        process.env.ANALYTICS_SYNC_SECRET ||
        process.env.CONTENT_ENGINE_CRON_SECRET ||
        process.env.CONTENT_ENGINE_METRICS_SECRET ||
        "";

    if (secret) {
        const headerSecret = request.headers.get("x-analytics-secret") || request.headers.get("x-metrics-secret") || "";
        const bearer = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
        if (headerSecret === secret || bearer === secret) return true;
    }

    try {
        await requireAdmin();
        return true;
    } catch {
        return false;
    }
}

async function executeSync(payload: Record<string, unknown>) {
    const result = await syncAnalyticsCache({
        from: parseOptionalDate(payload.from),
        to: parseOptionalDate(payload.to),
        days: parseOptionalDays(payload.days),
        includeGa4:
            payload.includeGa4 === undefined
                ? undefined
                : parseBooleanLike(payload.includeGa4, true),
    });

    return result;
}

export async function GET(request: NextRequest) {
    const authorized = await verifyAnalyticsAuth(request);
    if (!authorized) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const payload: Record<string, unknown> = {
            from: searchParams.get("from"),
            to: searchParams.get("to"),
            days: searchParams.get("days"),
            includeGa4: searchParams.get("includeGa4"),
        };

        const result = await executeSync(payload);
        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to sync analytics cache" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const authorized = await verifyAnalyticsAuth(request);
    if (!authorized) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const result = await executeSync(payload);
        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to sync analytics cache" },
            { status: 500 }
        );
    }
}

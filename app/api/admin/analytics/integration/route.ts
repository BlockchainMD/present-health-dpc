import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import {
    getAnalyticsIntegrationStatus,
    listStateFilterOptions,
    updateAnalyticsConfig,
} from "@/lib/analytics-dashboard";

export const runtime = "nodejs";

function parseBooleanLike(value: unknown) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
    }
    return false;
}

async function assertAdmin() {
    try {
        await requireAdmin();
        return true;
    } catch {
        return false;
    }
}

export async function GET() {
    const authorized = await assertAdmin();
    if (!authorized) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const [integration, stateOptions] = await Promise.all([
            getAnalyticsIntegrationStatus(),
            Promise.resolve(listStateFilterOptions()),
        ]);

        return NextResponse.json({ success: true, integration, stateOptions });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to load analytics integration" },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    const authorized = await assertAdmin();
    if (!authorized) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
        }

        const payload = body as Record<string, unknown>;

        const patch: {
            searchConsoleSiteUrl?: string;
            ga4PropertyId?: string;
            useGa4?: boolean;
            useNativeFallback?: boolean;
        } = {};

        if (Object.prototype.hasOwnProperty.call(payload, "searchConsoleSiteUrl")) {
            patch.searchConsoleSiteUrl = String(payload.searchConsoleSiteUrl || "");
        }

        if (Object.prototype.hasOwnProperty.call(payload, "ga4PropertyId")) {
            patch.ga4PropertyId = String(payload.ga4PropertyId || "");
        }

        if (Object.prototype.hasOwnProperty.call(payload, "useGa4")) {
            patch.useGa4 = parseBooleanLike(payload.useGa4);
        }

        if (Object.prototype.hasOwnProperty.call(payload, "useNativeFallback")) {
            patch.useNativeFallback = parseBooleanLike(payload.useNativeFallback);
        }

        const [config, integration, stateOptions] = await Promise.all([
            updateAnalyticsConfig(patch),
            getAnalyticsIntegrationStatus(),
            Promise.resolve(listStateFilterOptions()),
        ]);

        return NextResponse.json({ success: true, config, integration, stateOptions });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to update analytics integration" },
            { status: 400 }
        );
    }
}

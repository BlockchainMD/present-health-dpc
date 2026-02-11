import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import {
    createAiOverviewObservation,
    listAiOverviewObservations,
} from "@/lib/analytics-dashboard";

export const runtime = "nodejs";

function parseIntParam(value: string | null, fallback: number, min: number, max: number) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.trunc(n)));
}

async function assertAdmin() {
    try {
        await requireAdmin();
        return true;
    } catch {
        return false;
    }
}

export async function GET(request: NextRequest) {
    const authorized = await assertAdmin();
    if (!authorized) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const q = searchParams.get("q") || null;
        const page = parseIntParam(searchParams.get("page"), 1, 1, 5000);
        const pageSize = parseIntParam(searchParams.get("pageSize"), 100, 10, 250);

        const data = await listAiOverviewObservations({ q, page, pageSize });

        return NextResponse.json({
            success: true,
            observations: data.observations,
            page: data.page,
            pageSize: data.pageSize,
            total: data.total,
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to load AI overview observations" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const authorized = await assertAdmin();
    if (!authorized) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        if (!payload || typeof payload !== "object") {
            return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
        }

        const observation = await createAiOverviewObservation(payload);
        return NextResponse.json({ success: true, observation });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to create AI overview observation" },
            { status: 400 }
        );
    }
}

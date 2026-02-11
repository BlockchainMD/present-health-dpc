import { EmployerProspectSource } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import {
    clampInt,
    createEmployerProspect,
    importEmployerProspectsFromCsv,
    listEmployerProspects,
    parseProspectSourceFilter,
    parseProspectStatusFilter,
    parseStateFilter,
} from "@/lib/employer-crm";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const q = (searchParams.get("q") || "").trim();
        const status = parseProspectStatusFilter(searchParams.get("status"));
        const source = parseProspectSourceFilter(searchParams.get("source"));
        const state = parseStateFilter(searchParams.get("state"));
        const dueOnly = searchParams.get("due") === "1";

        const page = clampInt(searchParams.get("page"), 1, 1, 5000);
        const pageSize = clampInt(searchParams.get("pageSize"), 100, 10, 250);

        const result = await listEmployerProspects({
            q,
            status,
            source,
            state,
            dueOnly,
            page,
            pageSize,
        });

        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error("[AdminEmployerProspectsAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load employer prospects" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
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

        const payload = body as Record<string, unknown>;
        const action = String(payload.action || "CREATE").trim().toUpperCase();

        if (action === "BULK_IMPORT_CSV") {
            const csvText = String(payload.csvText || "");
            if (!csvText.trim()) {
                return NextResponse.json({ success: false, error: "csvText is required" }, { status: 400 });
            }

            const defaultSource = parseProspectSourceFilter(payload.defaultSource) || EmployerProspectSource.MANUAL;
            const result = await importEmployerProspectsFromCsv({
                csvText,
                defaultSource,
            });

            return NextResponse.json({
                success: true,
                createdCount: result.createdCount,
                errors: result.errors,
            });
        }

        const prospect = await createEmployerProspect(payload);
        return NextResponse.json({ success: true, prospect });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to create employer prospect" },
            { status: 400 }
        );
    }
}

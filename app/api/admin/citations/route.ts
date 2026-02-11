import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { buildCitationAudit, createCitationDirectoryRow } from "@/lib/citations";

export const runtime = "nodejs";

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const report = await buildCitationAudit({ ensureSeed: true });
        return NextResponse.json({
            success: true,
            citations: report.citations,
            summary: report.summary,
        });
    } catch (error) {
        console.error("[AdminCitationsAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load citations" }, { status: 500 });
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

        const citation = await createCitationDirectoryRow(body as Record<string, unknown>);
        return NextResponse.json({ success: true, citation });
    } catch (error: any) {
        if (error?.code === "P2002") {
            return NextResponse.json({ success: false, error: "Platform name already exists" }, { status: 409 });
        }
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to create citation" },
            { status: 400 }
        );
    }
}

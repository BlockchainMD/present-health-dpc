import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { buildUnifiedLeadCsv, parseUnifiedLeadFilters } from "@/lib/unified-leads";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const filters = parseUnifiedLeadFilters(searchParams);
        const csv = await buildUnifiedLeadCsv(filters);

        return new Response(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="leads-export-${new Date().toISOString().slice(0, 10)}.csv"`,
            },
        });
    } catch (error) {
        console.error("[AdminUnifiedLeadExportAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to export leads CSV" }, { status: 500 });
    }
}


import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { buildCitationAudit, buildCitationAuditCsv } from "@/lib/citations";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const report = await buildCitationAudit({ ensureSeed: true });
        const format = (new URL(request.url).searchParams.get("format") || "").trim().toLowerCase();

        if (format === "csv") {
            const csv = buildCitationAuditCsv(report);
            return new Response(csv, {
                status: 200,
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": `attachment; filename="citation-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
                },
            });
        }

        return NextResponse.json({
            success: true,
            canonical: report.canonical,
            summary: report.summary,
            records: report.records,
        });
    } catch (error) {
        console.error("[AdminCitationAuditAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to build citation audit" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { buildSchemaAuditReport } from "@/lib/schema-audit";

export const runtime = "nodejs";

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const records = await buildSchemaAuditReport();
        const summary = {
            total: records.length,
            missing: records.filter((r) => r.missing).length,
            mismatched: records.filter((r) => r.issues.length > 0).length,
        };

        return NextResponse.json({ success: true, summary, records });
    } catch (error) {
        console.error("[AdminSchemaReportAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to build schema report" }, { status: 500 });
    }
}


import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/authz";
import { buildSchemaAuditReport } from "@/lib/schema-audit";

export const runtime = "nodejs";

export async function POST() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const records = await buildSchemaAuditReport();
        const uniquePaths = Array.from(new Set(records.map((r) => r.path))).slice(0, 1000);
        for (const path of uniquePaths) {
            revalidatePath(path);
        }

        return NextResponse.json({
            success: true,
            message: "Schema regenerated from current data and page caches revalidated.",
            revalidatedCount: uniquePaths.length,
        });
    } catch (error) {
        console.error("[AdminSchemaRegenerateAPI] POST error:", error);
        return NextResponse.json({ success: false, error: "Failed to regenerate schema" }, { status: 500 });
    }
}


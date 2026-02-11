import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { getPrReferenceData } from "@/lib/pr";

export const runtime = "nodejs";

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const reference = await getPrReferenceData();
        return NextResponse.json({ success: true, reference });
    } catch (error) {
        console.error("[AdminPrReferenceAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load PR reference data" }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { getPrBoilerplate, updatePrBoilerplate } from "@/lib/pr";

export const runtime = "nodejs";

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const boilerplate = await getPrBoilerplate();
        return NextResponse.json({ success: true, boilerplate });
    } catch (error) {
        console.error("[AdminPrBoilerplateAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load boilerplate" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
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

        const boilerplate = await updatePrBoilerplate(body as Record<string, unknown>);
        return NextResponse.json({ success: true, boilerplate });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to update boilerplate" },
            { status: 400 }
        );
    }
}

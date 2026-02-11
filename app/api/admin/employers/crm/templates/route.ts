import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { getEmployerOutreachTemplates, upsertEmployerOutreachTemplates } from "@/lib/employer-crm";

export const runtime = "nodejs";

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const templates = await getEmployerOutreachTemplates();
        return NextResponse.json({ success: true, templates });
    } catch (error) {
        console.error("[AdminEmployerCrmTemplatesAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load outreach templates" }, { status: 500 });
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

        const payload = body as Record<string, unknown>;
        const templates = await upsertEmployerOutreachTemplates(payload.templates);
        return NextResponse.json({ success: true, templates });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to update outreach templates" },
            { status: 400 }
        );
    }
}

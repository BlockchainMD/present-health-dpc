import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { draftEmployerOutreachEmail, getEmployerProspectById } from "@/lib/employer-crm";

export const runtime = "nodejs";

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
        const prospectId = String(payload.prospectId || "").trim();

        let companyName = String(payload.companyName || "").trim();
        let contactName = String(payload.contactName || "").trim();
        let estimatedEmployees =
            typeof payload.estimatedEmployees === "number"
                ? payload.estimatedEmployees
                : Number.parseInt(String(payload.estimatedEmployees || ""), 10);

        if (prospectId) {
            const prospect = await getEmployerProspectById(prospectId);
            if (prospect) {
                companyName = companyName || prospect.companyName;
                contactName = contactName || prospect.contactName || "";
                estimatedEmployees =
                    Number.isFinite(estimatedEmployees) && estimatedEmployees > 0
                        ? estimatedEmployees
                        : prospect.estimatedEmployees || 0;
            }
        }

        if (!companyName) {
            return NextResponse.json({ success: false, error: "companyName is required" }, { status: 400 });
        }

        const draft = await draftEmployerOutreachEmail({
            templateId: String(payload.templateId || "") || undefined,
            prospectId: prospectId || undefined,
            companyName,
            contactName: contactName || undefined,
            estimatedEmployees: Number.isFinite(estimatedEmployees) ? estimatedEmployees : undefined,
            context: String(payload.context || "").trim() || undefined,
        });

        return NextResponse.json({ success: true, draft });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to draft outreach email" },
            { status: 500 }
        );
    }
}

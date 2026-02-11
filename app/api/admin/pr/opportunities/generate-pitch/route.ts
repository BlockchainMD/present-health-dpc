import { PrOpportunityType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { generateOpportunityPitch, parsePrEnums } from "@/lib/pr";

export const runtime = "nodejs";

function parseOpportunityType(value: unknown) {
    const parsed = parsePrEnums.opportunityType(value);
    if (!parsed) {
        throw new Error(
            `opportunityType must be one of ${Object.values(PrOpportunityType).join(", ")}`
        );
    }
    return parsed;
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
        const outletName = String(payload.outletName || "").trim();
        if (!outletName) {
            return NextResponse.json({ success: false, error: "outletName is required" }, { status: 400 });
        }

        const result = await generateOpportunityPitch({
            outletName,
            opportunityType: parseOpportunityType(payload.opportunityType),
            contactName: payload.contactName ? String(payload.contactName) : undefined,
            storyAngle: payload.storyAngle ? String(payload.storyAngle) : undefined,
            keyContext: payload.keyContext ? String(payload.keyContext) : undefined,
        });

        return NextResponse.json({ success: true, pitch: result });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to generate pitch" },
            { status: 500 }
        );
    }
}

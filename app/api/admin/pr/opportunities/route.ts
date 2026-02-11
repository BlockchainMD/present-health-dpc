import { PrOpportunityType, PrPitchStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { createOpportunity, listOpportunities, parsePrEnums } from "@/lib/pr";

export const runtime = "nodejs";

function parseDateInput(value: unknown) {
    if (value === null) return null;
    if (value === undefined) return undefined;

    const text = String(value || "").trim();
    if (!text) return null;

    const parsed = new Date(text);
    if (!Number.isFinite(parsed.getTime())) {
        throw new Error(`Invalid date: ${text}`);
    }

    return parsed;
}

function parseOpportunityType(value: unknown) {
    const parsed = parsePrEnums.opportunityType(value);
    if (!parsed) {
        throw new Error(
            `opportunityType must be one of ${Object.values(PrOpportunityType).join(", ")}`
        );
    }
    return parsed;
}

function parsePitchStatus(value: unknown) {
    if (value === undefined || value === null || value === "") return undefined;

    const parsed = parsePrEnums.pitchStatus(value);
    if (!parsed) {
        throw new Error(`pitchStatus must be one of ${Object.values(PrPitchStatus).join(", ")}`);
    }
    return parsed;
}

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const q = (searchParams.get("q") || "").trim();
        const pitchStatus = parsePrEnums.pitchStatus(searchParams.get("pitchStatus"));
        const opportunityType = parsePrEnums.opportunityType(searchParams.get("opportunityType"));

        const limitRaw = Number.parseInt(searchParams.get("limit") || "", 10);
        const limit = Number.isFinite(limitRaw) ? limitRaw : 120;

        const opportunities = await listOpportunities({ pitchStatus, opportunityType, q, limit });
        return NextResponse.json({ success: true, opportunities });
    } catch (error) {
        console.error("[AdminPrOpportunitiesAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load opportunities" }, { status: 500 });
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

        const payload = body as Record<string, unknown>;

        const opportunity = await createOpportunity({
            opportunityType: parseOpportunityType(payload.opportunityType),
            outletName: String(payload.outletName || ""),
            contactName:
                payload.contactName === undefined ? undefined : payload.contactName === null ? null : String(payload.contactName),
            contactEmail:
                payload.contactEmail === undefined
                    ? undefined
                    : payload.contactEmail === null
                        ? null
                        : String(payload.contactEmail),
            pitchStatus: parsePitchStatus(payload.pitchStatus),
            pitchText: payload.pitchText === undefined ? undefined : payload.pitchText === null ? null : String(payload.pitchText),
            resultUrl: payload.resultUrl === undefined ? undefined : payload.resultUrl === null ? null : String(payload.resultUrl),
            date: parseDateInput(payload.date),
            notes: payload.notes === undefined ? undefined : payload.notes === null ? null : String(payload.notes),
            llmProvider:
                payload.llmProvider === undefined ? undefined : payload.llmProvider === null ? null : String(payload.llmProvider),
            llmModel: payload.llmModel === undefined ? undefined : payload.llmModel === null ? null : String(payload.llmModel),
            llmPrompt:
                payload.llmPrompt === undefined ? undefined : payload.llmPrompt === null ? null : String(payload.llmPrompt),
            llmResponse:
                payload.llmResponse === undefined
                    ? undefined
                    : payload.llmResponse === null
                        ? null
                        : String(payload.llmResponse),
        });

        return NextResponse.json({ success: true, opportunity });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to create opportunity" },
            { status: 400 }
        );
    }
}

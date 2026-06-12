import { PrOpportunityType, PrPitchStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { parsePrEnums, updateOpportunity } from "@/lib/pr";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

function parseDateInput(value: unknown) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const text = String(value || "").trim();
    if (!text) return null;

    const parsed = new Date(text);
    if (!Number.isFinite(parsed.getTime())) {
        throw new Error(`Invalid date: ${text}`);
    }

    return parsed;
}

function parseOpportunityType(value: unknown) {
    if (value === undefined || value === null || value === "") return undefined;

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

export async function GET(_request: NextRequest, { params }: { params: Params }) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const opportunity = await prisma.prOpportunity.findUnique({
            where: { id },
            include: {
                mentions: {
                    orderBy: { mentionDate: "desc" },
                    select: {
                        id: true,
                        mentionType: true,
                        title: true,
                        sourceName: true,
                        url: true,
                        mentionDate: true,
                    },
                },
                _count: {
                    select: {
                        mentions: true,
                    },
                },
            },
        });

        if (!opportunity) {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, opportunity });
    } catch (error) {
        console.error("[AdminPrOpportunityAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load opportunity" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
        }

        const payload = body as Record<string, unknown>;

        const opportunity = await updateOpportunity(id, {
            opportunityType: parseOpportunityType(payload.opportunityType),
            outletName: payload.outletName === undefined ? undefined : String(payload.outletName || ""),
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
        if (error?.code === "P2025") {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }

        return NextResponse.json(
            { success: false, error: error?.message || "Failed to update opportunity" },
            { status: 400 }
        );
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        await prisma.prOpportunity.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }

        console.error("[AdminPrOpportunityAPI] DELETE error:", error);
        return NextResponse.json({ success: false, error: "Failed to delete opportunity" }, { status: 500 });
    }
}

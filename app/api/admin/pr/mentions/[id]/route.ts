import { PrMentionType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { parsePrEnums, updateMention } from "@/lib/pr";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { id: string } | Promise<{ id: string }>;

function parseDateInput(value: unknown) {
    if (value === undefined) return undefined;
    if (value === null) return undefined;

    const text = String(value || "").trim();
    if (!text) return undefined;
    const parsed = new Date(text);
    if (!Number.isFinite(parsed.getTime())) {
        throw new Error(`Invalid date: ${text}`);
    }
    return parsed;
}

function parseMentionType(value: unknown) {
    if (value === undefined || value === null || value === "") return undefined;

    const parsed = parsePrEnums.mentionType(value);
    if (!parsed) {
        throw new Error(
            `mentionType must be one of ${Object.values(PrMentionType).join(", ")}`
        );
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
        const mention = await prisma.prMention.findUnique({
            where: { id },
            include: {
                pressRelease: {
                    select: { id: true, headline: true, status: true },
                },
                opportunity: {
                    select: { id: true, outletName: true, opportunityType: true, pitchStatus: true },
                },
            },
        });

        if (!mention) {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, mention });
    } catch (error) {
        console.error("[AdminPrMentionAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load mention" }, { status: 500 });
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

        const mention = await updateMention(id, {
            mentionType: parseMentionType(payload.mentionType),
            title: payload.title === undefined ? undefined : String(payload.title || ""),
            sourceName: payload.sourceName === undefined ? undefined : payload.sourceName === null ? null : String(payload.sourceName),
            url: payload.url === undefined ? undefined : String(payload.url || ""),
            mentionDate: parseDateInput(payload.mentionDate),
            notes: payload.notes === undefined ? undefined : payload.notes === null ? null : String(payload.notes),
            pressReleaseId:
                payload.pressReleaseId === undefined
                    ? undefined
                    : payload.pressReleaseId === null
                        ? null
                        : String(payload.pressReleaseId),
            opportunityId:
                payload.opportunityId === undefined
                    ? undefined
                    : payload.opportunityId === null
                        ? null
                        : String(payload.opportunityId),
        });

        return NextResponse.json({ success: true, mention });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }

        return NextResponse.json(
            { success: false, error: error?.message || "Failed to update mention" },
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
        await prisma.prMention.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }

        console.error("[AdminPrMentionAPI] DELETE error:", error);
        return NextResponse.json({ success: false, error: "Failed to delete mention" }, { status: 500 });
    }
}

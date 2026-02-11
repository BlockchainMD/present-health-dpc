import { PrMentionType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { createMention, listMentions, parsePrEnums } from "@/lib/pr";

export const runtime = "nodejs";

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

function parseMentionType(value: unknown) {
    const parsed = parsePrEnums.mentionType(value);
    if (!parsed) {
        throw new Error(
            `mentionType must be one of ${Object.values(PrMentionType).join(", ")}`
        );
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
        const mentionType = parsePrEnums.mentionType(searchParams.get("mentionType"));
        const limitRaw = Number.parseInt(searchParams.get("limit") || "", 10);
        const limit = Number.isFinite(limitRaw) ? limitRaw : 160;

        const mentions = await listMentions({ mentionType, q, limit });
        return NextResponse.json({ success: true, mentions });
    } catch (error) {
        console.error("[AdminPrMentionsAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load mentions" }, { status: 500 });
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

        const mentionDate = parseDateInput(payload.mentionDate);
        const mention = await createMention({
            mentionType: parseMentionType(payload.mentionType),
            title: String(payload.title || ""),
            sourceName: payload.sourceName === undefined ? undefined : payload.sourceName === null ? null : String(payload.sourceName),
            url: String(payload.url || ""),
            mentionDate: mentionDate || new Date(),
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
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to create mention" },
            { status: 400 }
        );
    }
}

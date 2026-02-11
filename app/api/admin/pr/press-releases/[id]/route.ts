import { PressReleaseStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { parsePrEnums, updatePressRelease } from "@/lib/pr";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { id: string } | Promise<{ id: string }>;

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

function parseStringArray(value: unknown) {
    if (value === undefined) return undefined;
    if (value === null) return [];

    if (Array.isArray(value)) {
        return value
            .map((item) => String(item || "").trim())
            .filter(Boolean)
            .slice(0, 100);
    }

    if (typeof value === "string") {
        return value
            .split(/\n|,|;/g)
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 100);
    }

    return [];
}

function parseStatus(value: unknown) {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = parsePrEnums.pressReleaseStatus(value);
    if (!parsed) {
        throw new Error(`status must be one of ${Object.values(PressReleaseStatus).join(", ")}`);
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
        const release = await prisma.pressRelease.findUnique({
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

        if (!release) {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, release });
    } catch (error) {
        console.error("[AdminPrPressReleaseAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load press release" }, { status: 500 });
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
        const release = await updatePressRelease(id, {
            headlineTopic: payload.headlineTopic === undefined ? undefined : String(payload.headlineTopic || ""),
            targetAngle:
                payload.targetAngle === undefined ? undefined : payload.targetAngle === null ? null : String(payload.targetAngle),
            keyFacts: payload.keyFacts === undefined ? undefined : payload.keyFacts === null ? null : String(payload.keyFacts),
            headline: payload.headline === undefined ? undefined : String(payload.headline || ""),
            subheadline:
                payload.subheadline === undefined ? undefined : payload.subheadline === null ? null : String(payload.subheadline),
            datelineCity:
                payload.datelineCity === undefined ? undefined : payload.datelineCity === null ? null : String(payload.datelineCity),
            datelineDate: parseDateInput(payload.datelineDate),
            leadParagraph:
                payload.leadParagraph === undefined
                    ? undefined
                    : payload.leadParagraph === null
                        ? null
                        : String(payload.leadParagraph),
            body: payload.body === undefined ? undefined : String(payload.body || ""),
            physicianQuote:
                payload.physicianQuote === undefined
                    ? undefined
                    : payload.physicianQuote === null
                        ? null
                        : String(payload.physicianQuote),
            boilerplate:
                payload.boilerplate === undefined
                    ? undefined
                    : payload.boilerplate === null
                        ? null
                        : String(payload.boilerplate),
            mediaContactName:
                payload.mediaContactName === undefined
                    ? undefined
                    : payload.mediaContactName === null
                        ? null
                        : String(payload.mediaContactName),
            mediaContactEmail:
                payload.mediaContactEmail === undefined
                    ? undefined
                    : payload.mediaContactEmail === null
                        ? null
                        : String(payload.mediaContactEmail),
            mediaContactPhone:
                payload.mediaContactPhone === undefined
                    ? undefined
                    : payload.mediaContactPhone === null
                        ? null
                        : String(payload.mediaContactPhone),
            status: parseStatus(payload.status),
            submittedOutlets: parseStringArray(payload.submittedOutlets),
            publishedUrls: parseStringArray(payload.publishedUrls),
            scheduledFor: parseDateInput(payload.scheduledFor),
            submittedAt: parseDateInput(payload.submittedAt),
            publishedAt: parseDateInput(payload.publishedAt),
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

        return NextResponse.json({ success: true, release });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }

        return NextResponse.json(
            { success: false, error: error?.message || "Failed to update press release" },
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
        await prisma.pressRelease.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }

        console.error("[AdminPrPressReleaseAPI] DELETE error:", error);
        return NextResponse.json({ success: false, error: "Failed to delete press release" }, { status: 500 });
    }
}

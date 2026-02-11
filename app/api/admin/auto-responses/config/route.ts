import { NextRequest, NextResponse } from "next/server";
import type { AutoResponseSource } from "@prisma/client";

import { requireAdmin } from "@/lib/authz";
import {
    AUTO_RESPONSE_SOURCES,
    getAutoResponseTemplates,
    upsertAutoResponseTemplates,
} from "@/lib/auto-response";

export const runtime = "nodejs";

type PatchPayload = {
    templates?: Array<{
        source: string;
        enabled?: boolean;
        delayMinutes?: number;
        subjectTemplate?: string;
        bodyTemplate?: string;
        followUpEnabled?: boolean;
        followUpDelayHours?: number;
        followUpSubjectTemplate?: string | null;
        followUpBodyTemplate?: string | null;
    }>;
};

function isAutoResponseSource(value: string): value is AutoResponseSource {
    return AUTO_RESPONSE_SOURCES.includes(value as AutoResponseSource);
}

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const templates = await getAutoResponseTemplates();
        return NextResponse.json({ success: true, templates });
    } catch (error) {
        console.error("[AdminAutoResponseConfigAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load templates" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = (await request.json().catch(() => null)) as PatchPayload | null;
        const templates = Array.isArray(body?.templates) ? body.templates : [];

        const normalized = templates
            .map((item) => {
                const source = String(item?.source || "").trim();
                if (!isAutoResponseSource(source)) return null;
                return {
                    source,
                    enabled: typeof item.enabled === "boolean" ? item.enabled : undefined,
                    delayMinutes:
                        typeof item.delayMinutes === "number" || typeof item.delayMinutes === "string"
                            ? Number(item.delayMinutes)
                            : undefined,
                    subjectTemplate: typeof item.subjectTemplate === "string" ? item.subjectTemplate : undefined,
                    bodyTemplate: typeof item.bodyTemplate === "string" ? item.bodyTemplate : undefined,
                    followUpEnabled: typeof item.followUpEnabled === "boolean" ? item.followUpEnabled : undefined,
                    followUpDelayHours:
                        typeof item.followUpDelayHours === "number" || typeof item.followUpDelayHours === "string"
                            ? Number(item.followUpDelayHours)
                            : undefined,
                    followUpSubjectTemplate:
                        item.followUpSubjectTemplate === null
                            ? null
                            : typeof item.followUpSubjectTemplate === "string"
                                ? item.followUpSubjectTemplate
                                : undefined,
                    followUpBodyTemplate:
                        item.followUpBodyTemplate === null
                            ? null
                            : typeof item.followUpBodyTemplate === "string"
                                ? item.followUpBodyTemplate
                                : undefined,
                };
            })
            .filter((x): x is NonNullable<typeof x> => Boolean(x));

        const updated = await upsertAutoResponseTemplates(normalized);
        return NextResponse.json({ success: true, templates: updated });
    } catch (error) {
        console.error("[AdminAutoResponseConfigAPI] PATCH error:", error);
        return NextResponse.json(
            { success: false, error: errorMessage(error, "Failed to save templates") },
            { status: 500 }
        );
    }
}

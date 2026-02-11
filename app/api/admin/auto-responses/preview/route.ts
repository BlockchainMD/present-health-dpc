import { NextRequest, NextResponse } from "next/server";
import type { AutoResponseSource } from "@prisma/client";

import { requireAdmin } from "@/lib/authz";
import { AUTO_RESPONSE_SOURCES, previewAutoResponse } from "@/lib/auto-response";

export const runtime = "nodejs";

function isAutoResponseSource(value: string): value is AutoResponseSource {
    return AUTO_RESPONSE_SOURCES.includes(value as AutoResponseSource);
}

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export async function POST(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        if (!body || typeof body !== "object") {
            return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
        }

        const sourceRaw = String(body.source || "").trim();
        if (!isAutoResponseSource(sourceRaw)) {
            return NextResponse.json({ success: false, error: "Invalid source" }, { status: 400 });
        }

        const rendered = await previewAutoResponse({
            source: sourceRaw,
            firstName: typeof body.firstName === "string" ? body.firstName : undefined,
            email: typeof body.email === "string" ? body.email : undefined,
            state: typeof body.state === "string" ? body.state : undefined,
            companyName: typeof body.companyName === "string" ? body.companyName : undefined,
            sourcePage: typeof body.sourcePage === "string" ? body.sourcePage : undefined,
            subjectTemplate: typeof body.subjectTemplate === "string" ? body.subjectTemplate : undefined,
            bodyTemplate: typeof body.bodyTemplate === "string" ? body.bodyTemplate : undefined,
            followUp: Boolean(body.followUp),
        });

        return NextResponse.json({ success: true, preview: rendered });
    } catch (error) {
        console.error("[AdminAutoResponsePreviewAPI] POST error:", error);
        return NextResponse.json(
            { success: false, error: errorMessage(error, "Failed to build preview") },
            { status: 500 }
        );
    }
}

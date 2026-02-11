import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { generatePressReleaseDraft } from "@/lib/pr";

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
        const headlineTopic = String(payload.headlineTopic || "").trim();
        const keyFacts = String(payload.keyFacts || "").trim();
        const targetAngle = String(payload.targetAngle || "").trim();

        if (!headlineTopic) {
            return NextResponse.json({ success: false, error: "headlineTopic is required" }, { status: 400 });
        }

        const result = await generatePressReleaseDraft({
            headlineTopic,
            keyFacts,
            targetAngle,
        });

        return NextResponse.json({
            success: true,
            draft: result.draft,
            generation: {
                provider: result.generation.provider,
                model: result.generation.model,
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to generate press release draft" },
            { status: 500 }
        );
    }
}

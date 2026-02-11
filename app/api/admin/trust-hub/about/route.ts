import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { getTrustHubAboutBlocks, upsertTrustHubAboutBlocks } from "@/lib/trust-hub";

export const runtime = "nodejs";

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const blocks = await getTrustHubAboutBlocks();
        return NextResponse.json({ success: true, blocks });
    } catch (error) {
        console.error("[AdminTrustHubAboutAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load content" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
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

        await upsertTrustHubAboutBlocks({
            practiceOverviewMarkdown: typeof payload.practiceOverviewMarkdown === "string" ? payload.practiceOverviewMarkdown : undefined,
            dpcCoversMarkdown: typeof payload.dpcCoversMarkdown === "string" ? payload.dpcCoversMarkdown : undefined,
            dpcDoesntCoverMarkdown: typeof payload.dpcDoesntCoverMarkdown === "string" ? payload.dpcDoesntCoverMarkdown : undefined,
            hipaaPrivacyMarkdown: typeof payload.hipaaPrivacyMarkdown === "string" ? payload.hipaaPrivacyMarkdown : undefined,
        });

        const blocks = await getTrustHubAboutBlocks();
        return NextResponse.json({ success: true, blocks });
    } catch (error) {
        console.error("[AdminTrustHubAboutAPI] PATCH error:", error);
        return NextResponse.json({ success: false, error: "Failed to save content" }, { status: 500 });
    }
}


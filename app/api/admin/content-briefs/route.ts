import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import {
    generateAndCreateContentBrief,
    listContentBriefs,
    parseContentBriefIntent,
    parseContentBriefStatus,
} from "@/lib/content-briefs";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const q = (searchParams.get("q") || "").trim();
        const status = parseContentBriefStatus(searchParams.get("status"));
        const limitRaw = Number.parseInt(searchParams.get("limit") || "", 10);
        const limit = Number.isFinite(limitRaw) ? limitRaw : 120;

        const briefs = await listContentBriefs({ query: q, status, limit });
        return NextResponse.json({ success: true, briefs });
    } catch (error) {
        console.error("[AdminContentBriefsAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load content briefs" }, { status: 500 });
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
        const targetKeyword = typeof payload.targetKeyword === "string" ? payload.targetKeyword : "";
        const searchIntent = parseContentBriefIntent(
            typeof payload.searchIntent === "string" ? payload.searchIntent : ""
        );
        const targetAudience = typeof payload.targetAudience === "string" ? payload.targetAudience : "";

        if (!searchIntent) {
            return NextResponse.json(
                {
                    success: false,
                    error: "searchIntent must be one of INFORMATIONAL, TRANSACTIONAL, COMMERCIAL, NAVIGATIONAL",
                },
                { status: 400 }
            );
        }

        const brief = await generateAndCreateContentBrief({
            targetKeyword,
            searchIntent,
            targetAudience,
        });

        return NextResponse.json({ success: true, brief });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to generate content brief" },
            { status: 500 }
        );
    }
}

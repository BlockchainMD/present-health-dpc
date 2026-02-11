import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import {
    createReviewRequestLink,
    ensureDefaultReviewRequestLink,
    listReviewRequestLinks,
} from "@/lib/reviews";
import { prisma } from "@/lib/prisma";
import { getSiteOrigin } from "@/lib/site-url";

export const runtime = "nodejs";

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        await ensureDefaultReviewRequestLink();
        const [links, clickRows] = await Promise.all([
            listReviewRequestLinks(),
            prisma.reviewRequestClick.groupBy({
                by: ["linkId", "platform"],
                _count: { _all: true },
            }),
        ]);
        const origin = getSiteOrigin();

        const countsByLink = new Map<string, Record<string, number>>();
        for (const row of clickRows) {
            const existing = countsByLink.get(row.linkId) || {};
            existing[row.platform] = row._count._all;
            countsByLink.set(row.linkId, existing);
        }

        return NextResponse.json({
            success: true,
            links: links.map((link) => ({
                ...link,
                requestUrl: `${origin}/review-request?token=${encodeURIComponent(link.token)}`,
                platformCounts: countsByLink.get(link.id) || {},
            })),
        });
    } catch (error) {
        console.error("[AdminReviewRequestLinksAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load review request links" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

        const link = await createReviewRequestLink(
            payload.name === undefined ? null : String(payload.name || "")
        );

        return NextResponse.json({ success: true, link });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to create review request link" },
            { status: 400 }
        );
    }
}

import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { draftReviewResponse } from "@/lib/reviews";

export const runtime = "nodejs";

type Params = { id: string } | Promise<{ id: string }>;

export async function POST(_request: NextRequest, { params }: { params: Params }) {
    let session;
    try {
        session = await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const review = await draftReviewResponse({
            reviewId: id,
            actorUserId: (session?.user as any)?.id || null,
        });

        return NextResponse.json({ success: true, review });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to draft response" },
            { status: 400 }
        );
    }
}

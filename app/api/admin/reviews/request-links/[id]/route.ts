import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { updateReviewRequestLink } from "@/lib/reviews";

type Params = { id: string } | Promise<{ id: string }>;

export const runtime = "nodejs";

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
        const link = await updateReviewRequestLink({
            id,
            isActive: payload.isActive === undefined ? undefined : Boolean(payload.isActive),
            name: payload.name === undefined ? undefined : String(payload.name || ""),
        });

        return NextResponse.json({ success: true, link });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to update review request link" },
            { status: 400 }
        );
    }
}

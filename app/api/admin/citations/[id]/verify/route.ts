import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { markCitationVerified } from "@/lib/citations";

export const runtime = "nodejs";

type Params = { id: string } | Promise<{ id: string }>;

export async function POST(_request: NextRequest, { params }: { params: Params }) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const citation = await markCitationVerified(id);
        if (!citation) {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, citation });
    } catch (error) {
        console.error("[AdminCitationVerifyAPI] POST error:", error);
        return NextResponse.json({ success: false, error: "Failed to verify citation" }, { status: 500 });
    }
}

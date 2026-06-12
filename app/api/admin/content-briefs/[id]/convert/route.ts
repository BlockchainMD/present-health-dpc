import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { convertContentBriefToDraft } from "@/lib/content-briefs";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export async function POST(_request: NextRequest, { params }: { params: Params }) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const result = await convertContentBriefToDraft(id);
        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to convert content brief" },
            { status: 500 }
        );
    }
}

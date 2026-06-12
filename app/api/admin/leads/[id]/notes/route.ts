import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { addUnifiedLeadNote, getUnifiedLeadDetail } from "@/lib/unified-leads";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export async function POST(request: NextRequest, { params }: { params: Params }) {
    let session;
    try {
        session = await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = ((session as any)?.user?.id as string | undefined) || null;

    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
        }

        const note = typeof (body as Record<string, unknown>).note === "string"
            ? ((body as Record<string, unknown>).note as string)
            : "";

        await addUnifiedLeadNote(id, note, { createdByUserId: userId });
        const lead = await getUnifiedLeadDetail(id);

        return NextResponse.json({ success: true, lead });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to add note" },
            { status: 400 }
        );
    }
}


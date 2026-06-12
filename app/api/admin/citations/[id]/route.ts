import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { deleteCitationDirectoryRow, updateCitationDirectoryRow } from "@/lib/citations";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

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

        const citation = await updateCitationDirectoryRow(id, body as Record<string, unknown>);
        return NextResponse.json({ success: true, citation });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to update citation" },
            { status: 400 }
        );
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        await deleteCitationDirectoryRow(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }
        console.error("[AdminCitationAPI] DELETE error:", error);
        return NextResponse.json({ success: false, error: "Failed to delete citation" }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { updateContentBrief } from "@/lib/content-briefs";

export const runtime = "nodejs";

type Params = { id: string } | Promise<{ id: string }>;

export async function GET(_request: NextRequest, { params }: { params: Params }) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const brief = await prisma.contentBrief.findUnique({ where: { id } });
        if (!brief) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        return NextResponse.json({ success: true, brief });
    } catch (error) {
        console.error("[AdminContentBriefAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load content brief" }, { status: 500 });
    }
}

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

        const brief = await updateContentBrief(id, body as Record<string, unknown>);
        return NextResponse.json({ success: true, brief });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to update content brief" },
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
        await prisma.contentBrief.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }
        console.error("[AdminContentBriefAPI] DELETE error:", error);
        return NextResponse.json({ success: false, error: "Failed to delete content brief" }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export const runtime = "nodejs";

type Params = { id: string } | Promise<{ id: string }>;

function coerceSortOrder(value: unknown) {
    const n = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : NaN;
    if (!Number.isFinite(n)) return 0;
    return Math.max(-9999, Math.min(9999, Math.trunc(n)));
}

export async function GET(_request: NextRequest, { params }: { params: Params }) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    try {
        const testimonial = await prisma.employerTestimonial.findUnique({ where: { id } });
        if (!testimonial) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        return NextResponse.json({ success: true, testimonial });
    } catch (error) {
        console.error("[AdminEmployerTestimonialAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch testimonial" }, { status: 500 });
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
        const payload = body as Record<string, unknown>;

        const updateData: any = {};

        if (payload.companyName !== undefined) updateData.companyName = typeof payload.companyName === "string" ? payload.companyName.trim() : payload.companyName;
        if (payload.quote !== undefined) updateData.quote = typeof payload.quote === "string" ? payload.quote.trim() : payload.quote;

        if (payload.personName !== undefined) {
            const v = typeof payload.personName === "string" ? payload.personName.trim() : payload.personName;
            updateData.personName = typeof v === "string" && v ? v : v === "" ? null : v;
        }
        if (payload.personTitle !== undefined) {
            const v = typeof payload.personTitle === "string" ? payload.personTitle.trim() : payload.personTitle;
            updateData.personTitle = typeof v === "string" && v ? v : v === "" ? null : v;
        }
        if (payload.logoUrl !== undefined) {
            const v = typeof payload.logoUrl === "string" ? payload.logoUrl.trim() : payload.logoUrl;
            updateData.logoUrl = typeof v === "string" && v ? v : v === "" ? null : v;
        }

        if (payload.sortOrder !== undefined) updateData.sortOrder = coerceSortOrder(payload.sortOrder);
        if (payload.isActive !== undefined) updateData.isActive = typeof payload.isActive === "boolean" ? payload.isActive : payload.isActive;

        if (typeof updateData.companyName === "string" && !updateData.companyName.trim()) {
            return NextResponse.json({ success: false, error: "companyName cannot be empty" }, { status: 400 });
        }
        if (typeof updateData.quote === "string" && !updateData.quote.trim()) {
            return NextResponse.json({ success: false, error: "quote cannot be empty" }, { status: 400 });
        }

        const testimonial = await prisma.employerTestimonial.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({ success: true, testimonial });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }
        console.error("[AdminEmployerTestimonialAPI] PATCH error:", error);
        return NextResponse.json({ success: false, error: "Failed to update testimonial" }, { status: 500 });
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
        await prisma.employerTestimonial.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }
        console.error("[AdminEmployerTestimonialAPI] DELETE error:", error);
        return NextResponse.json({ success: false, error: "Failed to delete testimonial" }, { status: 500 });
    }
}


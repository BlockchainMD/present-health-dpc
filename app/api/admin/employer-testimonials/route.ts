import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export const runtime = "nodejs";

function coerceSortOrder(value: unknown) {
    const n = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : NaN;
    if (!Number.isFinite(n)) return 0;
    return Math.max(-9999, Math.min(9999, Math.trunc(n)));
}

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const testimonials = await prisma.employerTestimonial.findMany({
            orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
        });
        return NextResponse.json({ success: true, testimonials });
    } catch (error) {
        console.error("[AdminEmployerTestimonialsAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch testimonials" }, { status: 500 });
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

        const companyName = typeof payload.companyName === "string" ? payload.companyName.trim() : "";
        const quote = typeof payload.quote === "string" ? payload.quote.trim() : "";
        if (!companyName || !quote) {
            return NextResponse.json({ success: false, error: "Missing required fields: companyName, quote" }, { status: 400 });
        }

        const testimonial = await prisma.employerTestimonial.create({
            data: {
                companyName,
                quote,
                personName: typeof payload.personName === "string" && payload.personName.trim() ? payload.personName.trim() : null,
                personTitle: typeof payload.personTitle === "string" && payload.personTitle.trim() ? payload.personTitle.trim() : null,
                logoUrl: typeof payload.logoUrl === "string" && payload.logoUrl.trim() ? payload.logoUrl.trim() : null,
                sortOrder: coerceSortOrder(payload.sortOrder),
                isActive: typeof payload.isActive === "boolean" ? payload.isActive : false,
            },
        });

        return NextResponse.json({ success: true, testimonial });
    } catch (error) {
        console.error("[AdminEmployerTestimonialsAPI] POST error:", error);
        return NextResponse.json({ success: false, error: "Failed to create testimonial" }, { status: 500 });
    }
}


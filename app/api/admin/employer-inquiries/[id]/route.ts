import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { upsertUnifiedLeadFromEmployerInquiry } from "@/lib/unified-leads";

export const runtime = "nodejs";

type Params = { id: string } | Promise<{ id: string }>;

const ALLOWED_STATUS = new Set(["NEW", "CONTACTED", "CONVERTED", "CLOSED"]);

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
        const nextStatusRaw = typeof payload.status === "string" ? payload.status.trim().toUpperCase() : "";
        if (!nextStatusRaw || !ALLOWED_STATUS.has(nextStatusRaw)) {
            return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
        }

        const inquiry = await prisma.employerInquiry.update({
            where: { id },
            data: { status: nextStatusRaw },
            select: {
                id: true,
                companyName: true,
                contactName: true,
                email: true,
                phone: true,
                employeeCount: true,
                employeeCountRange: true,
                message: true,
                status: true,
                submittedAt: true,
                updatedAt: true,
            },
        });

        void upsertUnifiedLeadFromEmployerInquiry(
            {
                id: inquiry.id,
                companyName: inquiry.companyName,
                contactName: inquiry.contactName,
                email: inquiry.email,
                phone: inquiry.phone,
                employeeCount: inquiry.employeeCount,
                employeeCountRange: inquiry.employeeCountRange,
                message: inquiry.message,
                status: inquiry.status,
                submittedAt: inquiry.submittedAt,
                updatedAt: inquiry.updatedAt,
            },
            false
        ).catch((error) => {
            console.error("[AdminEmployerInquiryAPI] Unified lead sync error:", error);
        });

        return NextResponse.json({ success: true, inquiry });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }
        console.error("[AdminEmployerInquiryAPI] PATCH error:", error);
        return NextResponse.json({ success: false, error: "Failed to update inquiry" }, { status: 500 });
    }
}

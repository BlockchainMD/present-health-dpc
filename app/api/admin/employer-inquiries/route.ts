import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export const runtime = "nodejs";

const ALLOWED_STATUS = new Set(["NEW", "CONTACTED", "CONVERTED", "CLOSED"]);

function clampInt(value: unknown, fallback: number, min: number, max: number) {
    const n = typeof value === "string" ? Number.parseInt(value, 10) : typeof value === "number" ? value : NaN;
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.trunc(n)));
}

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") || "").trim().toUpperCase();
    const q = (searchParams.get("q") || "").trim();
    const page = clampInt(searchParams.get("page"), 1, 1, 5000);
    const pageSize = clampInt(searchParams.get("pageSize"), 25, 10, 100);

    const where: any = {};
    if (status && ALLOWED_STATUS.has(status)) where.status = status;
    if (q) {
        where.OR = [
            { companyName: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
        ];
    }

    try {
        const skip = (page - 1) * pageSize;
        const [total, inquiries] = await prisma.$transaction([
            prisma.employerInquiry.count({ where }),
            prisma.employerInquiry.findMany({
                where,
                orderBy: { submittedAt: "desc" },
                skip,
                take: pageSize,
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
            }),
        ]);

        return NextResponse.json({ success: true, inquiries, page, pageSize, total });
    } catch (error) {
        console.error("[AdminEmployerInquiriesAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch inquiries" }, { status: 500 });
    }
}


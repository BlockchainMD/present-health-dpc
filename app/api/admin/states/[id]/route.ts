import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;
type FaqItem = { question: string; answer: string };

function coerceFaqs(value: unknown): FaqItem[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const obj = item as Record<string, unknown>;
            const question = typeof obj.question === "string" ? obj.question.trim() : "";
            const answer = typeof obj.answer === "string" ? obj.answer.trim() : "";
            if (!question || !answer) return null;
            return { question, answer };
        })
        .filter((x): x is FaqItem => Boolean(x));
}

export async function GET(_request: NextRequest, { params }: { params: Params }) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    try {
        const state = await prisma.state.findUnique({ where: { id } });
        if (!state) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        return NextResponse.json({ success: true, state });
    } catch (error) {
        console.error("[AdminStateAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch state" }, { status: 500 });
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

        if (payload.name !== undefined) updateData.name = typeof payload.name === "string" ? payload.name.trim() : payload.name;
        if (payload.slug !== undefined) updateData.slug = typeof payload.slug === "string" ? payload.slug.trim() : payload.slug;
        if (payload.isActive !== undefined) updateData.isActive = typeof payload.isActive === "boolean" ? payload.isActive : payload.isActive;

        if (payload.metaTitle !== undefined) {
            const v = typeof payload.metaTitle === "string" ? payload.metaTitle.trim() : payload.metaTitle;
            updateData.metaTitle = typeof v === "string" && v ? v : v === "" ? null : v;
        }
        if (payload.metaDescription !== undefined) {
            const v = typeof payload.metaDescription === "string" ? payload.metaDescription.trim() : payload.metaDescription;
            updateData.metaDescription = typeof v === "string" && v ? v : v === "" ? null : v;
        }

        if (payload.telehealthRegulationsSummary !== undefined)
            updateData.telehealthRegulationsSummary = typeof payload.telehealthRegulationsSummary === "string" ? payload.telehealthRegulationsSummary : payload.telehealthRegulationsSummary;
        if (payload.rxLogistics !== undefined) updateData.rxLogistics = typeof payload.rxLogistics === "string" ? payload.rxLogistics : payload.rxLogistics;
        if (payload.labOptions !== undefined) updateData.labOptions = typeof payload.labOptions === "string" ? payload.labOptions : payload.labOptions;
        if (payload.emergencyProtocol !== undefined)
            updateData.emergencyProtocol = typeof payload.emergencyProtocol === "string" ? payload.emergencyProtocol : payload.emergencyProtocol;
        if (payload.hsaNotes !== undefined) updateData.hsaNotes = typeof payload.hsaNotes === "string" ? payload.hsaNotes : payload.hsaNotes;

        if (payload.faqs !== undefined) {
            updateData.faqs = coerceFaqs(payload.faqs);
        }

        const state = await prisma.state.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({ success: true, state });
    } catch (error: any) {
        if (error?.code === "P2002") {
            return NextResponse.json({ success: false, error: "Slug already exists" }, { status: 409 });
        }
        console.error("[AdminStateAPI] PATCH error:", error);
        return NextResponse.json({ success: false, error: "Failed to update state" }, { status: 500 });
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
        await prisma.state.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[AdminStateAPI] DELETE error:", error);
        return NextResponse.json({ success: false, error: "Failed to delete state" }, { status: 500 });
    }
}


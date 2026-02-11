import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export const runtime = "nodejs";

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

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const states = await prisma.state.findMany({
            orderBy: [{ isActive: "desc" }, { name: "asc" }],
        });
        return NextResponse.json({ success: true, states });
    } catch (error) {
        console.error("[AdminStatesAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch states" }, { status: 500 });
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

        const name = typeof payload.name === "string" ? payload.name.trim() : "";
        const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";
        if (!name || !slug) {
            return NextResponse.json({ success: false, error: "Missing required fields: name, slug" }, { status: 400 });
        }

        const metaTitle = typeof payload.metaTitle === "string" ? payload.metaTitle.trim() : "";
        const metaDescription = typeof payload.metaDescription === "string" ? payload.metaDescription.trim() : "";

        const state = await prisma.state.create({
            data: {
                name,
                slug,
                isActive: typeof payload.isActive === "boolean" ? payload.isActive : false,
                metaTitle: metaTitle || null,
                metaDescription: metaDescription || null,
                telehealthRegulationsSummary: typeof payload.telehealthRegulationsSummary === "string" ? payload.telehealthRegulationsSummary : null,
                rxLogistics: typeof payload.rxLogistics === "string" ? payload.rxLogistics : null,
                labOptions: typeof payload.labOptions === "string" ? payload.labOptions : null,
                emergencyProtocol: typeof payload.emergencyProtocol === "string" ? payload.emergencyProtocol : null,
                hsaNotes: typeof payload.hsaNotes === "string" ? payload.hsaNotes : null,
                faqs: coerceFaqs(payload.faqs),
            },
        });

        return NextResponse.json({ success: true, state });
    } catch (error: any) {
        if (error?.code === "P2002") {
            return NextResponse.json({ success: false, error: "Slug already exists" }, { status: 409 });
        }
        console.error("[AdminStatesAPI] POST error:", error);
        return NextResponse.json({ success: false, error: "Failed to create state" }, { status: 500 });
    }
}


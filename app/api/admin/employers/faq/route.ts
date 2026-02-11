import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { getEmployerFaqs, upsertEmployerFaqs } from "@/lib/employers";

export const runtime = "nodejs";

type FaqItem = { question: string; answer: string };

function coerceFaqs(value: unknown): FaqItem[] {
    if (!value) return [];
    if (Array.isArray(value)) return value as any;
    if (typeof value === "object") {
        const obj = value as Record<string, unknown>;
        if (Array.isArray(obj.faqs)) return obj.faqs as any;
    }
    return [];
}

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const faqs = await getEmployerFaqs();
        return NextResponse.json({ success: true, faqs });
    } catch (error) {
        console.error("[AdminEmployerFaqAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load FAQs" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => null);
        const items = coerceFaqs(body);
        const faqs = await upsertEmployerFaqs(items);
        return NextResponse.json({ success: true, faqs });
    } catch (error) {
        console.error("[AdminEmployerFaqAPI] PATCH error:", error);
        return NextResponse.json({ success: false, error: "Failed to save FAQs" }, { status: 500 });
    }
}


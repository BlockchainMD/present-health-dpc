import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { getChatbotConfig, upsertChatbotConfig } from "@/lib/chatbot-server";
import { normalizePageToggles } from "@/lib/chatbot-shared";

export const runtime = "nodejs";

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const config = await getChatbotConfig();
        return NextResponse.json({ success: true, config });
    } catch (error) {
        console.error("[AdminChatbotConfigAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load chatbot config" }, { status: 500 });
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
        if (!body || typeof body !== "object") {
            return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
        }
        const payload = body as Record<string, unknown>;

        const next = {
            enabled: typeof payload.enabled === "boolean" ? payload.enabled : undefined,
            showOnAllPublicPages:
                typeof payload.showOnAllPublicPages === "boolean" ? payload.showOnAllPublicPages : undefined,
            pageToggles: payload.pageToggles ? normalizePageToggles(payload.pageToggles) : undefined,
            knowledgeBase: typeof payload.knowledgeBase === "string" ? payload.knowledgeBase : undefined,
            welcomeMessage: typeof payload.welcomeMessage === "string" ? payload.welcomeMessage : undefined,
        };

        const config = await upsertChatbotConfig(next);
        return NextResponse.json({ success: true, config });
    } catch (error) {
        console.error("[AdminChatbotConfigAPI] PATCH error:", error);
        return NextResponse.json({ success: false, error: "Failed to save chatbot config" }, { status: 500 });
    }
}


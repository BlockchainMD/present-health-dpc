import { NextResponse } from "next/server";
import { getChatbotConfig, getServedStateNames } from "@/lib/chatbot-server";

export const runtime = "nodejs";

export async function GET() {
    try {
        const [config, states] = await Promise.all([getChatbotConfig(), getServedStateNames()]);

        return NextResponse.json({
            success: true,
            config: {
                enabled: config.enabled,
                showOnAllPublicPages: config.showOnAllPublicPages,
                pageToggles: config.pageToggles,
                welcomeMessage: config.welcomeMessage,
            },
            states,
        });
    } catch (error) {
        console.error("[chatbot/public-config] Failed to load config", error);
        return NextResponse.json({ success: false, error: "Failed to load chatbot config" }, { status: 500 });
    }
}


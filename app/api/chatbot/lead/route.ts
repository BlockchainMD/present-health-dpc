import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildConversationSummaryFromLogs, cleanupExpiredChatbotLogs } from "@/lib/chatbot-server";
import { clipText, normalizeEmail } from "@/lib/chatbot-shared";
import { stateFromNameOrCode } from "@/lib/us-states";
import { notifyChatbotLead } from "@/lib/notify";
import { upsertUnifiedLeadFromChatbotLead } from "@/lib/unified-leads";
import { queueAutoResponseFromChatbotLead } from "@/lib/auto-response";

export const runtime = "nodejs";

type LeadRequestBody = {
    sessionId?: string;
    firstName?: string;
    email?: string;
    state?: string;
    heardAboutUs?: string;
};

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeState(value: string) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const parsed = stateFromNameOrCode(raw);
    return parsed?.name || clipText(raw, 80);
}

export async function POST(request: NextRequest) {
    await cleanupExpiredChatbotLogs();

    let body: LeadRequestBody | null = null;
    try {
        body = (await request.json().catch(() => null)) as LeadRequestBody | null;
    } catch {
        body = null;
    }

    if (!body || typeof body !== "object") {
        return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const firstName = typeof body.firstName === "string" ? clipText(body.firstName.trim(), 80) : "";
    const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
    const state = normalizeState(typeof body.state === "string" ? body.state : "");
    const heardAboutUs =
        typeof body.heardAboutUs === "string" && body.heardAboutUs.trim()
            ? clipText(body.heardAboutUs.trim(), 160)
            : null;

    if (!firstName) {
        return NextResponse.json({ success: false, error: "First name is required" }, { status: 400 });
    }
    if (!email || !isValidEmail(email)) {
        return NextResponse.json({ success: false, error: "Valid email is required" }, { status: 400 });
    }
    if (!state) {
        return NextResponse.json({ success: false, error: "State is required" }, { status: 400 });
    }
    if (!heardAboutUs) {
        return NextResponse.json({ success: false, error: "Please tell us how you heard about Present Health" }, { status: 400 });
    }

    const logs = sessionId
        ? await prisma.chatbotConversationLog.findMany({
            where: { sessionId },
            orderBy: { createdAt: "asc" },
            take: 30,
            select: {
                userMessage: true,
                assistantMessage: true,
                createdAt: true,
            },
        })
        : [];

    const conversationSummary = buildConversationSummaryFromLogs(logs);

    try {
        const lead = await prisma.chatbotLead.upsert({
            where: {
                email_source: {
                    email,
                    source: "chatbot",
                },
            },
            update: {
                firstName,
                state,
                heardAboutUs,
                conversationSummary,
            },
            create: {
                firstName,
                email,
                state,
                heardAboutUs,
                source: "chatbot",
                conversationSummary,
            },
        });

        if (sessionId) {
            await prisma.chatbotConversationLog.updateMany({
                where: {
                    sessionId,
                    leadId: null,
                },
                data: { leadId: lead.id },
            });
        }

        try {
            await upsertUnifiedLeadFromChatbotLead(lead, true);
        } catch (syncError) {
            console.error("[chatbot/lead] Failed to sync unified lead", syncError);
        }

        try {
            await notifyChatbotLead(lead);
        } catch (notifyError) {
            console.error("[chatbot/lead] Failed to send lead notification email", notifyError);
        }

        try {
            await queueAutoResponseFromChatbotLead({
                id: lead.id,
                firstName: lead.firstName,
                email: lead.email,
                state: lead.state,
            });
        } catch (autoResponseError) {
            console.error("[chatbot/lead] Failed to queue auto-response email", autoResponseError);
        }

        return NextResponse.json({
            success: true,
            lead: {
                id: lead.id,
                firstName: lead.firstName,
                email: lead.email,
                state: lead.state,
                source: lead.source,
                createdAt: lead.createdAt,
            },
        });
    } catch (error) {
        console.error("[chatbot/lead] Failed to save lead", error);
        return NextResponse.json({ success: false, error: "Failed to save lead" }, { status: 500 });
    }
}

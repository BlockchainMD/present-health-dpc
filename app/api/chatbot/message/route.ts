import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    CHATBOT_MAX_MESSAGES_PER_SESSION,
    CHATBOT_MEDICAL_REDIRECT_MESSAGE,
    clipText,
    containsMedicalOrPhiRequest,
    detectProspectiveIntent,
    sanitizeMessageForStorage,
} from "@/lib/chatbot-shared";
import {
    buildChatbotSystemPrompt,
    cleanupExpiredChatbotLogs,
    generateChatbotReply,
    getChatbotConfig,
    type ChatbotLlmMessage,
    getServedStateNames,
} from "@/lib/chatbot-server";

export const runtime = "nodejs";

type MessageRequestBody = {
    sessionId?: string;
    pagePath?: string;
    message?: string;
    history?: Array<{ role?: string; content?: string }>;
};

function coerceHistory(value: unknown): ChatbotLlmMessage[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((x) => {
            if (!x || typeof x !== "object") return null;
            const obj = x as Record<string, unknown>;
            const role = obj.role === "assistant" ? "assistant" : obj.role === "user" ? "user" : null;
            const content = typeof obj.content === "string" ? clipText(obj.content, 1000) : "";
            if (!role || !content) return null;
            return { role, content } as ChatbotLlmMessage;
        })
        .filter((x): x is ChatbotLlmMessage => Boolean(x))
        .slice(-12);
}

function maybeSanitizeAssistantReply(value: string) {
    const text = clipText(value, 1200);
    const looksLikeDataCollectionPrompt =
        /\b(symptom|diagnos|medical history|medication|dose|prescription details)\b/i.test(text) &&
        /\b(share|tell me|provide|describe|what are your)\b/i.test(text);
    const looksLikeMedicalAdvice =
        /\b(you should|i recommend|take\b|dosage|diagnosis|diagnose|treatment)\b/i.test(text) &&
        /\b(symptom|medication|medicine|diagnosis|condition)\b/i.test(text);
    if (looksLikeDataCollectionPrompt) {
        return "I can help with Present Health membership, pricing, and joining steps. For medical concerns, your Present Health physician can help after you enroll.";
    }
    if (looksLikeMedicalAdvice) {
        return CHATBOT_MEDICAL_REDIRECT_MESSAGE;
    }
    return text;
}

export async function POST(request: NextRequest) {
    await cleanupExpiredChatbotLogs();

    let body: MessageRequestBody | null = null;
    try {
        body = (await request.json().catch(() => null)) as MessageRequestBody | null;
    } catch {
        body = null;
    }

    if (!body || typeof body !== "object") {
        return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const pagePath = typeof body.pagePath === "string" ? clipText(body.pagePath, 120) : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history = coerceHistory(body.history);

    if (!sessionId || sessionId.length > 120) {
        return NextResponse.json({ success: false, error: "Invalid sessionId" }, { status: 400 });
    }
    if (!message) {
        return NextResponse.json({ success: false, error: "Message is required" }, { status: 400 });
    }

    const config = await getChatbotConfig();
    if (!config.enabled) {
        return NextResponse.json({ success: false, error: "Chatbot is currently disabled" }, { status: 403 });
    }

    const existingCount = await prisma.chatbotConversationLog.count({ where: { sessionId } });
    if (existingCount >= CHATBOT_MAX_MESSAGES_PER_SESSION) {
        return NextResponse.json(
            {
                success: false,
                error: "Message limit reached for this session.",
                limitReached: true,
                reply: "You have reached the 20-message limit for this session. Please refresh to start a new chat.",
                messageCount: existingCount,
                maxMessages: CHATBOT_MAX_MESSAGES_PER_SESSION,
            },
            { status: 429 }
        );
    }

    const isMedicalOrPhi = containsMedicalOrPhiRequest(message);
    let reply = CHATBOT_MEDICAL_REDIRECT_MESSAGE;

    if (!isMedicalOrPhi) {
        const stateNames = await getServedStateNames();
        const systemPrompt = buildChatbotSystemPrompt(config, stateNames);
        const llmMessages = [...history, { role: "user", content: clipText(message, 1000) }] satisfies ChatbotLlmMessage[];
        reply = maybeSanitizeAssistantReply(await generateChatbotReply(systemPrompt, llmMessages));
    }

    const leadCaptureSuggested = !isMedicalOrPhi && (detectProspectiveIntent(message) || detectProspectiveIntent(reply));

    try {
        await prisma.chatbotConversationLog.create({
            data: {
                sessionId,
                pagePath: pagePath || null,
                userMessage: sanitizeMessageForStorage(message, isMedicalOrPhi),
                assistantMessage: clipText(reply, 1500),
                isMedicalRedirect: isMedicalOrPhi,
            },
        });
    } catch (error) {
        console.error("[chatbot/message] Failed to persist conversation log", error);
    }

    return NextResponse.json({
        success: true,
        reply,
        leadCaptureSuggested,
        messageCount: existingCount + 1,
        maxMessages: CHATBOT_MAX_MESSAGES_PER_SESSION,
    });
}

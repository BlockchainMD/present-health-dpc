import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import {
    CHATBOT_PAGE_OPTIONS,
    ChatbotConfig,
    DEFAULT_CHATBOT_CONFIG,
    clipText,
    normalizePageToggles,
} from "@/lib/chatbot-shared";

const CHATBOT_CONFIG_KEY = "chatbot:config";
const LOG_RETENTION_DAYS = 30;

export type ChatbotLlmMessage = {
    role: "user" | "assistant";
    content: string;
};

function parseConfigValue(value: unknown): ChatbotConfig {
    if (!value || typeof value !== "object") {
        return { ...DEFAULT_CHATBOT_CONFIG, pageToggles: normalizePageToggles(undefined) };
    }

    const obj = value as Record<string, unknown>;
    const enabled = typeof obj.enabled === "boolean" ? obj.enabled : DEFAULT_CHATBOT_CONFIG.enabled;
    const showOnAllPublicPages =
        typeof obj.showOnAllPublicPages === "boolean"
            ? obj.showOnAllPublicPages
            : DEFAULT_CHATBOT_CONFIG.showOnAllPublicPages;
    const knowledgeBase =
        typeof obj.knowledgeBase === "string" && obj.knowledgeBase.trim()
            ? obj.knowledgeBase
            : DEFAULT_CHATBOT_CONFIG.knowledgeBase;
    const welcomeMessage =
        typeof obj.welcomeMessage === "string" && obj.welcomeMessage.trim()
            ? obj.welcomeMessage
            : DEFAULT_CHATBOT_CONFIG.welcomeMessage;
    const pageToggles = normalizePageToggles(obj.pageToggles);

    return {
        enabled,
        showOnAllPublicPages,
        knowledgeBase,
        welcomeMessage,
        pageToggles,
    };
}

export async function getChatbotConfig(): Promise<ChatbotConfig> {
    try {
        const row = await prisma.contentStrategy.findUnique({ where: { key: CHATBOT_CONFIG_KEY } });
        return parseConfigValue(row?.value);
    } catch (error) {
        console.error("[chatbot] Failed to load chatbot config", error);
        return { ...DEFAULT_CHATBOT_CONFIG, pageToggles: normalizePageToggles(undefined) };
    }
}

export async function upsertChatbotConfig(next: Partial<ChatbotConfig>): Promise<ChatbotConfig> {
    const current = await getChatbotConfig();
    const merged: ChatbotConfig = {
        enabled: typeof next.enabled === "boolean" ? next.enabled : current.enabled,
        showOnAllPublicPages:
            typeof next.showOnAllPublicPages === "boolean" ? next.showOnAllPublicPages : current.showOnAllPublicPages,
        pageToggles: next.pageToggles ? normalizePageToggles(next.pageToggles) : current.pageToggles,
        knowledgeBase:
            typeof next.knowledgeBase === "string" && next.knowledgeBase.trim()
                ? next.knowledgeBase
                : current.knowledgeBase,
        welcomeMessage:
            typeof next.welcomeMessage === "string" && next.welcomeMessage.trim()
                ? next.welcomeMessage
                : current.welcomeMessage,
    };

    const value = {
        enabled: merged.enabled,
        showOnAllPublicPages: merged.showOnAllPublicPages,
        pageToggles: normalizePageToggles(merged.pageToggles),
        knowledgeBase: merged.knowledgeBase,
        welcomeMessage: merged.welcomeMessage,
        updatedAt: new Date().toISOString(),
    };

    await prisma.contentStrategy.upsert({
        where: { key: CHATBOT_CONFIG_KEY },
        update: { value: value as any },
        create: { key: CHATBOT_CONFIG_KEY, value: value as any },
    });

    return merged;
}

export async function getServedStateNames() {
    try {
        const rows = await prisma.state.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
            select: { name: true },
        });
        return rows.map((x) => x.name);
    } catch (error) {
        console.error("[chatbot] Failed to load served states", error);
        return [];
    }
}

export async function cleanupExpiredChatbotLogs() {
    const cutoff = new Date(Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    try {
        await prisma.chatbotConversationLog.deleteMany({
            where: { createdAt: { lt: cutoff } },
        });
    } catch (error) {
        console.error("[chatbot] Failed to clean expired conversation logs", error);
    }
}

export function buildChatbotSystemPrompt(config: ChatbotConfig, stateNames: string[]) {
    const statesLine = stateNames.length
        ? `We currently serve patients in these states: ${stateNames.join(", ")}.`
        : "We currently serve patients in select states; direct the user to /states for current availability.";

    const pageList = CHATBOT_PAGE_OPTIONS.map((x) => x.path).join(", ");

    return [
        "You are the Present Health virtual assistant for website visitors.",
        "You are a marketing and membership support assistant only.",
        "",
        "Rules you must follow:",
        "- Never collect or ask for health information, symptoms, diagnoses, medications, or any PHI.",
        "- Never provide medical advice, diagnosis, triage, or treatment recommendations.",
        "- Never claim to be a doctor or medical professional.",
        "- If asked medical questions, respond exactly: \"I'm not able to provide medical advice, but that's exactly the kind of thing your Present Health physician can help with! Would you like to learn about joining?\"",
        "- Keep replies warm, concise, and focused on practice details, pricing, coverage, state availability, and enrollment.",
        "- Do not invent policies or services not provided below.",
        "",
        "Present Health knowledge base:",
        config.knowledgeBase,
        "",
        statesLine,
        `Useful site routes: ${pageList}.`,
        "If asked for next step, prefer directing to /join or /book.",
    ].join("\n");
}

async function callClaude(systemPrompt: string, messages: ChatbotLlmMessage[]) {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!apiKey) return null;

    const model = process.env.CHATBOT_ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model,
            max_tokens: 500,
            temperature: 0.2,
            system: systemPrompt,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Claude request failed (${res.status}): ${detail || "unknown error"}`);
    }

    const data = await res.json().catch(() => null) as any;
    const text = Array.isArray(data?.content)
        ? data.content
            .map((part: any) => (part?.type === "text" && typeof part?.text === "string" ? part.text : ""))
            .join("\n")
            .trim()
        : "";
    return text || null;
}

async function callOpenAi(systemPrompt: string, messages: ChatbotLlmMessage[]) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    const openai = new OpenAI({ apiKey });
    const model = process.env.CHATBOT_OPENAI_MODEL || "gpt-4o-mini";
    const response = await openai.chat.completions.create({
        model,
        temperature: 0.2,
        max_tokens: 500,
        messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
    });

    return response.choices[0]?.message?.content?.trim() || null;
}

export async function generateChatbotReply(systemPrompt: string, messages: ChatbotLlmMessage[]) {
    try {
        const claudeReply = await callClaude(systemPrompt, messages);
        if (claudeReply) return clipText(claudeReply, 1200);
    } catch (error) {
        console.error("[chatbot] Claude call failed; falling back to OpenAI", error);
    }

    try {
        const openAiReply = await callOpenAi(systemPrompt, messages);
        if (openAiReply) return clipText(openAiReply, 1200);
    } catch (error) {
        console.error("[chatbot] OpenAI call failed", error);
    }

    return "I can help with Present Health pricing, state availability, and membership enrollment. Would you like details on plans or how to join?";
}

export function buildConversationSummaryFromLogs(
    logs: Array<{ userMessage: string; assistantMessage: string; createdAt: Date }>
) {
    if (!logs.length) return "No conversation history available.";

    const visibleUserLines = logs
        .map((x) => x.userMessage)
        .filter((x) => x && !x.startsWith("[REDACTED"))
        .slice(-6);

    const topics = new Set<string>();
    for (const line of visibleUserLines) {
        const text = line.toLowerCase();
        if (/\bpricing|price|cost|monthly|membership\b/.test(text)) topics.add("pricing");
        if (/\bstate|available|availability\b/.test(text)) topics.add("state availability");
        if (/\bjoin|signup|sign up|enroll|start\b/.test(text)) topics.add("joining");
        if (/\bemployer|group|team\b/.test(text)) topics.add("employer plans");
        if (/\bdoctor|physician\b/.test(text)) topics.add("physician model");
    }

    const topicLine = topics.size ? `Topics: ${Array.from(topics).join(", ")}.` : "Topics: general membership questions.";
    const lastQuestions = visibleUserLines.length
        ? `Recent user messages: ${visibleUserLines.map((x) => `"${clipText(x, 120)}"`).join(" ")}`
        : "Recent user messages were redacted for safety.";

    return clipText(`${topicLine} ${lastQuestions}`, 1200);
}


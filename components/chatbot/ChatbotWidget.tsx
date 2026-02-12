"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CHATBOT_MAX_MESSAGES_PER_SESSION, clipText } from "@/lib/chatbot-shared";

type Props = {
    pathname: string;
    stateOptions: string[];
    welcomeMessage: string;
};

type UiMessage = {
    id: string;
    role: "assistant" | "user";
    content: string;
    createdAt: number;
};

type PersistedState = {
    sessionId: string;
    messages: UiMessage[];
    messageCount: number;
    leadCaptured: boolean;
};

const STORAGE_KEY = "presenthealth_chatbot_session_v1";

function newId() {
    return (globalThis.crypto as any)?.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function defaultAssistantMessage(welcomeMessage: string): UiMessage {
    return {
        id: newId(),
        role: "assistant",
        content: clipText(welcomeMessage || "", 600) || "Hi! How can I help you with Present Health today?",
        createdAt: Date.now(),
    };
}

function parsePersisted(raw: string | null): PersistedState | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as PersistedState;
        if (!parsed || typeof parsed !== "object") return null;
        if (typeof parsed.sessionId !== "string" || !parsed.sessionId.trim()) return null;
        if (!Array.isArray(parsed.messages)) return null;
        const messages = parsed.messages
            .map((m) => {
                if (!m || typeof m !== "object") return null;
                const role = m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : null;
                const content = typeof m.content === "string" ? clipText(m.content, 1200) : "";
                const createdAt = typeof m.createdAt === "number" ? m.createdAt : Date.now();
                if (!role || !content) return null;
                return {
                    id: typeof m.id === "string" ? m.id : newId(),
                    role,
                    content,
                    createdAt,
                } as UiMessage;
            })
            .filter((x): x is UiMessage => Boolean(x))
            .slice(-40);
        return {
            sessionId: parsed.sessionId,
            messages,
            messageCount:
                typeof parsed.messageCount === "number" && parsed.messageCount >= 0
                    ? Math.min(CHATBOT_MAX_MESSAGES_PER_SESSION, Math.trunc(parsed.messageCount))
                    : 0,
            leadCaptured: Boolean(parsed.leadCaptured),
        };
    } catch {
        return null;
    }
}

export function ChatbotWidget({ pathname, stateOptions, welcomeMessage }: Props) {
    const [ready, setReady] = useState(false);
    const [open, setOpen] = useState(false);
    const [sessionId, setSessionId] = useState("");
    const [messages, setMessages] = useState<UiMessage[]>([]);
    const [messageCount, setMessageCount] = useState(0);
    const [leadCaptured, setLeadCaptured] = useState(false);
    const [showLeadForm, setShowLeadForm] = useState(false);

    const [input, setInput] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [leadFirstName, setLeadFirstName] = useState("");
    const [leadEmail, setLeadEmail] = useState("");
    const [leadState, setLeadState] = useState("");
    const [heardAboutUs, setHeardAboutUs] = useState("");
    const [leadSubmitting, setLeadSubmitting] = useState(false);

    const scrollRef = useRef<HTMLDivElement | null>(null);

    const maxMessages = CHATBOT_MAX_MESSAGES_PER_SESSION;
    const messagesRemaining = Math.max(0, maxMessages - messageCount);

    const sanitizedStateOptions = useMemo(() => {
        const unique = new Set<string>();
        for (const x of stateOptions || []) {
            const value = String(x || "").trim();
            if (!value) continue;
            unique.add(value);
        }
        return Array.from(unique).sort((a, b) => a.localeCompare(b));
    }, [stateOptions]);

    useEffect(() => {
        const persisted = parsePersisted(sessionStorage.getItem(STORAGE_KEY));
        if (persisted) {
            setSessionId(persisted.sessionId);
            setMessages(
                persisted.messages.length
                    ? persisted.messages
                    : [defaultAssistantMessage(welcomeMessage)]
            );
            setMessageCount(persisted.messageCount);
            setLeadCaptured(Boolean(persisted.leadCaptured));
            setShowLeadForm(false);
        } else {
            const sid = newId();
            setSessionId(sid);
            setMessages([defaultAssistantMessage(welcomeMessage)]);
            setMessageCount(0);
            setLeadCaptured(false);
            setShowLeadForm(false);
        }
        setReady(true);
    }, [welcomeMessage]);

    useEffect(() => {
        if (!ready || !sessionId) return;
        const payload: PersistedState = {
            sessionId,
            messages: messages.slice(-40),
            messageCount,
            leadCaptured,
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }, [ready, sessionId, messages, messageCount, leadCaptured]);

    useEffect(() => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, open, showLeadForm, submitting]);

    function appendMessage(role: "assistant" | "user", content: string) {
        setMessages((prev) => [
            ...prev,
            {
                id: newId(),
                role,
                content: clipText(content, 1600),
                createdAt: Date.now(),
            },
        ]);
    }

    async function sendMessage() {
        const text = clipText(input, 900).trim();
        if (!text) return;
        if (submitting) return;
        if (messageCount >= maxMessages) {
            setError("Message limit reached for this session.");
            return;
        }

        setError(null);
        setInput("");
        const history = messages.slice(-12).map((m) => ({
            role: m.role,
            content: m.content,
        }));
        appendMessage("user", text);
        setSubmitting(true);

        try {
            const res = await fetch("/api/chatbot/message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId,
                    pagePath: pathname,
                    message: text,
                    history,
                }),
            });
            const data = await res.json().catch(() => null);

            if (!res.ok || !data?.success) {
                if (data?.reply) {
                    appendMessage("assistant", data.reply);
                }
                setMessageCount(typeof data?.messageCount === "number" ? data.messageCount : messageCount);
                setError(data?.error || "Unable to send message.");
                return;
            }

            appendMessage("assistant", data.reply || "Thanks for your question. How else can I help?");
            if (typeof data.messageCount === "number") {
                setMessageCount(data.messageCount);
            } else {
                setMessageCount((prev) => Math.min(maxMessages, prev + 1));
            }
            if (data.leadCaptureSuggested && !leadCaptured) {
                setShowLeadForm(true);
            }
        } catch (e: any) {
            setError(e?.message || "Unable to send message.");
        } finally {
            setSubmitting(false);
        }
    }

    async function submitLead(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (leadSubmitting) return;
        setError(null);

        setLeadSubmitting(true);
        try {
            const res = await fetch("/api/chatbot/lead", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId,
                    firstName: leadFirstName,
                    email: leadEmail,
                    state: leadState,
                    heardAboutUs,
                }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                setError(data?.error || "Failed to save lead.");
                return;
            }

            setLeadCaptured(true);
            setShowLeadForm(false);
            appendMessage(
                "assistant",
                "Thanks! You're all set. If you'd like, you can book a consultation now or continue chatting about membership options."
            );
        } catch (e: any) {
            setError(e?.message || "Failed to save lead.");
        } finally {
            setLeadSubmitting(false);
        }
    }

    if (!ready) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[70]">
            {open ? (
                <div className="mb-3 w-[min(92vw,380px)] h-[min(78vh,640px)] rounded-2xl border border-border bg-background shadow-2xl flex flex-col overflow-hidden">
                    <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold text-foreground">Present Health Assistant</div>
                            <div className="text-xs text-muted-foreground">Marketing chat only. No medical advice.</div>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close chatbot">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-muted/10">
                        <div className="text-[11px] text-muted-foreground rounded-md border border-amber-200 bg-amber-50 px-2 py-1">
                            Please do not share personal medical or health information in chat.
                        </div>

                        {messages.map((m) => (
                            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                                        m.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-br-md"
                                            : "bg-card border border-border text-foreground rounded-bl-md"
                                    }`}
                                >
                                    {m.content}
                                </div>
                            </div>
                        ))}

                        {submitting ? (
                            <div className="flex justify-start">
                                <div className="max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-card border border-border text-muted-foreground rounded-bl-md">
                                    Typing...
                                </div>
                            </div>
                        ) : null}

                        {showLeadForm && !leadCaptured ? (
                            <div className="rounded-xl border border-border bg-card p-3 space-y-3">
                                <div className="text-sm font-medium text-foreground">Want membership details tailored to you?</div>
                                <div className="text-xs text-muted-foreground">
                                    Share your info and we&apos;ll follow up. This is for non-medical enrollment questions only.
                                </div>
                                <form onSubmit={submitLead} className="grid gap-3">
                                    <div className="grid gap-1">
                                        <Label htmlFor="chatLeadFirstName">First name</Label>
                                        <Input
                                            id="chatLeadFirstName"
                                            value={leadFirstName}
                                            onChange={(e) => setLeadFirstName(e.target.value)}
                                            required
                                            disabled={leadSubmitting}
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <Label htmlFor="chatLeadEmail">Email</Label>
                                        <Input
                                            id="chatLeadEmail"
                                            type="email"
                                            value={leadEmail}
                                            onChange={(e) => setLeadEmail(e.target.value)}
                                            required
                                            disabled={leadSubmitting}
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <Label htmlFor="chatLeadState">State</Label>
                                        {sanitizedStateOptions.length ? (
                                            <select
                                                id="chatLeadState"
                                                value={leadState}
                                                onChange={(e) => setLeadState(e.target.value)}
                                                required
                                                disabled={leadSubmitting}
                                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                            >
                                                <option value="">Select your state</option>
                                                {sanitizedStateOptions.map((stateName) => (
                                                    <option key={stateName} value={stateName}>
                                                        {stateName}
                                                    </option>
                                                ))}
                                                <option value="Other">Other</option>
                                            </select>
                                        ) : (
                                            <Input
                                                id="chatLeadState"
                                                value={leadState}
                                                onChange={(e) => setLeadState(e.target.value)}
                                                required
                                                disabled={leadSubmitting}
                                            />
                                        )}
                                    </div>
                                    <div className="grid gap-1">
                                        <Label htmlFor="chatHeardAboutUs">How did you hear about us?</Label>
                                        <Input
                                            id="chatHeardAboutUs"
                                            value={heardAboutUs}
                                            onChange={(e) => setHeardAboutUs(e.target.value)}
                                            required
                                            disabled={leadSubmitting}
                                        />
                                    </div>
                                    <Button type="submit" disabled={leadSubmitting}>
                                        {leadSubmitting ? "Saving..." : "Share details"}
                                    </Button>
                                </form>
                            </div>
                        ) : null}

                        {leadCaptured ? (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 space-y-2">
                                <div>Lead captured. Ready for the next step?</div>
                                <div className="flex flex-wrap gap-2">
                                    <Button asChild size="sm">
                                        <Link href="/join">Start membership</Link>
                                    </Button>
                                    <Button asChild size="sm" variant="outline">
                                        <Link href="/join">Continue joining</Link>
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="border-t border-border px-3 py-3 bg-background">
                        <div className="flex items-center gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about pricing, states, or how to join..."
                                disabled={submitting || messageCount >= maxMessages}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        void sendMessage();
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                size="icon"
                                onClick={() => void sendMessage()}
                                disabled={submitting || messageCount >= maxMessages || !input.trim()}
                                aria-label="Send message"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>{messagesRemaining} messages remaining</span>
                            <span>Session-only history</span>
                        </div>
                        {error ? <div className="mt-2 text-xs text-red-700">{error}</div> : null}
                    </div>
                </div>
            ) : null}

            <Button
                className="h-14 w-14 rounded-full shadow-lg"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "Close chat" : "Open chat"}
            >
                <MessageCircle className="h-6 w-6" />
            </Button>
        </div>
    );
}

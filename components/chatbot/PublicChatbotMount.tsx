"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { isChatbotEnabledForPath, type ChatbotConfig } from "@/lib/chatbot-shared";
import { ChatbotWidget } from "@/components/chatbot/ChatbotWidget";

type PublicConfig = Pick<ChatbotConfig, "enabled" | "showOnAllPublicPages" | "pageToggles" | "welcomeMessage">;

const FALLBACK_CONFIG: PublicConfig = {
    enabled: true,
    showOnAllPublicPages: false,
    pageToggles: { "/join": true },
    welcomeMessage:
        "Hi! I'm the Present Health virtual assistant. I can help with pricing, state availability, and how to join. I can't provide medical advice.",
};

export function PublicChatbotMount() {
    const pathname = usePathname() || "/";
    const [config, setConfig] = useState<PublicConfig>(FALLBACK_CONFIG);
    const [states, setStates] = useState<string[]>([]);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const res = await fetch("/api/chatbot/public-config", { cache: "no-store" });
                const data = await res.json().catch(() => null);
                if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to load chatbot config");

                if (!cancelled) {
                    const apiConfig = data.config as PublicConfig;
                    setConfig({
                        enabled: typeof apiConfig?.enabled === "boolean" ? apiConfig.enabled : FALLBACK_CONFIG.enabled,
                        showOnAllPublicPages:
                            typeof apiConfig?.showOnAllPublicPages === "boolean"
                                ? apiConfig.showOnAllPublicPages
                                : FALLBACK_CONFIG.showOnAllPublicPages,
                        pageToggles:
                            apiConfig?.pageToggles && typeof apiConfig.pageToggles === "object"
                                ? apiConfig.pageToggles
                                : FALLBACK_CONFIG.pageToggles,
                        welcomeMessage:
                            typeof apiConfig?.welcomeMessage === "string" && apiConfig.welcomeMessage.trim()
                                ? apiConfig.welcomeMessage
                                : FALLBACK_CONFIG.welcomeMessage,
                    });
                    setStates(Array.isArray(data.states) ? data.states : []);
                    setReady(true);
                }
            } catch {
                if (!cancelled) {
                    setReady(true);
                }
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    const isEnabled = useMemo(() => {
        return isChatbotEnabledForPath(config, pathname);
    }, [config, pathname]);

    if (!ready || !isEnabled) return null;

    return <ChatbotWidget pathname={pathname} stateOptions={states} welcomeMessage={config.welcomeMessage} />;
}

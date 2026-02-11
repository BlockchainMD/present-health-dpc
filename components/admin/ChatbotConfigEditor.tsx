"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    CHATBOT_PAGE_OPTIONS,
    type ChatbotConfig,
    DEFAULT_CHATBOT_CONFIG,
    normalizePageToggles,
} from "@/lib/chatbot-shared";

function normalizeConfig(value: unknown): ChatbotConfig {
    if (!value || typeof value !== "object") {
        return {
            ...DEFAULT_CHATBOT_CONFIG,
            pageToggles: normalizePageToggles(DEFAULT_CHATBOT_CONFIG.pageToggles),
        };
    }

    const obj = value as Record<string, unknown>;
    return {
        enabled: typeof obj.enabled === "boolean" ? obj.enabled : DEFAULT_CHATBOT_CONFIG.enabled,
        showOnAllPublicPages:
            typeof obj.showOnAllPublicPages === "boolean"
                ? obj.showOnAllPublicPages
                : DEFAULT_CHATBOT_CONFIG.showOnAllPublicPages,
        pageToggles: normalizePageToggles(obj.pageToggles),
        knowledgeBase:
            typeof obj.knowledgeBase === "string" && obj.knowledgeBase.trim()
                ? obj.knowledgeBase
                : DEFAULT_CHATBOT_CONFIG.knowledgeBase,
        welcomeMessage:
            typeof obj.welcomeMessage === "string" && obj.welcomeMessage.trim()
                ? obj.welcomeMessage
                : DEFAULT_CHATBOT_CONFIG.welcomeMessage,
    };
}

export function ChatbotConfigEditor() {
    const [config, setConfig] = useState<ChatbotConfig | null>(null);
    const [status, setStatus] = useState<
        { type: "loading" } | { type: "idle" } | { type: "saving" } | { type: "success" } | { type: "error"; message: string }
    >({ type: "loading" });

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setStatus({ type: "loading" });
            try {
                const res = await fetch("/api/admin/chatbot/config");
                const data = await res.json().catch(() => null);
                if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to load chatbot config");
                if (!cancelled) {
                    setConfig(normalizeConfig(data.config));
                    setStatus({ type: "idle" });
                }
            } catch (e: any) {
                if (!cancelled) setStatus({ type: "error", message: e?.message || "Failed to load chatbot config" });
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    async function save() {
        if (!config) return;
        setStatus({ type: "saving" });
        try {
            const res = await fetch("/api/admin/chatbot/config", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to save chatbot config");
            setConfig(normalizeConfig(data.config));
            setStatus({ type: "success" });
            setTimeout(() => setStatus({ type: "idle" }), 1400);
        } catch (e: any) {
            setStatus({ type: "error", message: e?.message || "Failed to save chatbot config" });
        }
    }

    if (status.type === "loading" && !config) {
        return <div className="text-sm text-muted-foreground">Loading...</div>;
    }
    if (!config) {
        return <div className="text-sm text-red-700">Unable to load chatbot config.</div>;
    }

    return (
        <div className="max-w-6xl space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Chatbot</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage the marketing chatbot shown on public pages.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline">
                        <Link href="/admin/chatbot/leads">View leads</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/admin/chatbot/logs">View logs</Link>
                    </Button>
                    <Button onClick={save} disabled={status.type === "saving"}>
                        {status.type === "saving" ? "Saving..." : "Save"}
                    </Button>
                </div>
            </div>

            {status.type === "error" ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{status.message}</div>
            ) : null}
            {status.type === "success" ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Saved.</div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle>Knowledge Base</CardTitle>
                        <CardDescription>
                            This text is included in the system prompt. Keep it factual and aligned with visible site content.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="welcomeMessage">Welcome message (shown to visitors)</Label>
                            <Textarea
                                id="welcomeMessage"
                                rows={3}
                                value={config.welcomeMessage}
                                onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="knowledgeBase">System prompt context</Label>
                            <Textarea
                                id="knowledgeBase"
                                rows={16}
                                value={config.knowledgeBase}
                                onChange={(e) => setConfig({ ...config, knowledgeBase: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Visibility</CardTitle>
                            <CardDescription>Enable chatbot globally or select routes.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
                                <div>
                                    <div className="font-medium text-foreground">Chatbot enabled</div>
                                    <div className="text-xs text-muted-foreground">Master switch for all public pages.</div>
                                </div>
                                <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
                            </div>

                            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
                                <div>
                                    <div className="font-medium text-foreground">Show on all public pages</div>
                                    <div className="text-xs text-muted-foreground">
                                        When on, per-page switches below act as exceptions.
                                    </div>
                                </div>
                                <Switch
                                    checked={config.showOnAllPublicPages}
                                    onCheckedChange={(v) => setConfig({ ...config, showOnAllPublicPages: v })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle>Per-page toggles</CardTitle>
                            <CardDescription>
                                {config.showOnAllPublicPages
                                    ? "Turn pages off when global mode is enabled."
                                    : "Turn pages on when selective mode is enabled."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {CHATBOT_PAGE_OPTIONS.map((page) => {
                                const checked = config.pageToggles[page.path] === true;
                                return (
                                    <div key={page.path} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                                        <div>
                                            <div className="text-sm font-medium text-foreground">{page.label}</div>
                                            <div className="text-xs text-muted-foreground font-mono">{page.path}</div>
                                        </div>
                                        <Switch
                                            checked={checked}
                                            onCheckedChange={(v) =>
                                                setConfig({
                                                    ...config,
                                                    pageToggles: {
                                                        ...config.pageToggles,
                                                        [page.path]: v,
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

"use client";

type EventPayload = {
    eventType: string;
    path?: string;
    metadata?: Record<string, unknown>;
};

export function trackEvent(payload: EventPayload) {
    try {
        const body = JSON.stringify(payload);
        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
            const blob = new Blob([body], { type: "application/json" });
            if (navigator.sendBeacon("/api/analytics/event", blob)) return;
        }

        void fetch("/api/analytics/event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
            credentials: "same-origin",
        });
    } catch {
        // no-op
    }
}


import { NextRequest, NextResponse } from "next/server";

import { getOrCreateAttributionSession } from "@/lib/attribution";
import { recordConversionEvent } from "@/lib/conversion";

export const runtime = "nodejs";

function sanitizeEventType(value: unknown) {
    const raw = String(value || "").trim().toUpperCase();
    if (!raw) return "";
    if (!/^[A-Z0-9_]{3,64}$/.test(raw)) return "";
    return raw;
}

function sanitizePath(value: unknown) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (!raw.startsWith("/")) return "";
    return raw.slice(0, 300);
}

function toJsonObject(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
}

function pickValue(body: Record<string, unknown> | null, key: string) {
    const value = body?.[key];
    if (typeof value !== "string") return "";
    return value.trim();
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        const eventType = sanitizeEventType(body?.eventType || body?.type);
        if (!eventType) {
            return NextResponse.json({ success: false, error: "eventType is required" }, { status: 400 });
        }

        const path = sanitizePath(body?.path);

        const attributionSessionId = await getOrCreateAttributionSession(undefined, {
            gclid: pickValue(body, "gclid") || undefined,
            utmSource: pickValue(body, "utm_source") || undefined,
            utmMedium: pickValue(body, "utm_medium") || undefined,
            utmCampaign: pickValue(body, "utm_campaign") || undefined,
            utmTerm: pickValue(body, "utm_term") || undefined,
            utmContent: pickValue(body, "utm_content") || undefined,
            landingPath: path || "/",
            referrer: request.headers.get("referer") || undefined,
            userAgentHash: request.headers.get("user-agent") || undefined,
            ipHash:
                request.headers.get("x-forwarded-for") ||
                request.headers.get("x-real-ip") ||
                undefined,
        });

        const metadata = toJsonObject(body?.metadata);
        await recordConversionEvent({
            type: eventType,
            attributionSessionId,
            metadata: {
                ...metadata,
                path: path || null,
                source: "NativeEventTrack",
            },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to record event" },
            { status: 500 }
        );
    }
}


"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function shouldSkipPath(pathname: string) {
    if (!pathname.startsWith("/")) return true;
    if (pathname.startsWith("/admin")) return true;
    if (pathname.startsWith("/_next")) return true;
    if (pathname.startsWith("/api/")) return true;
    return false;
}

export function NativePageTracker() {
    const pathname = usePathname() || "/";
    const lastTrackedKeyRef = useRef<string>("");

    useEffect(() => {
        const path = String(pathname || "/");
        if (!path || shouldSkipPath(path)) return;
        const search = typeof window !== "undefined" ? window.location.search : "";
        const query = search.startsWith("?") ? search.slice(1) : search;
        const trackKey = query ? `${path}?${query}` : path;
        if (lastTrackedKeyRef.current === trackKey) return;
        lastTrackedKeyRef.current = trackKey;
        const params = new URLSearchParams(query);

        const payloadObject: Record<string, string> = { path };
        if (query) payloadObject.query = query;
        const utmSource = params.get("utm_source") || "";
        const utmMedium = params.get("utm_medium") || "";
        const utmCampaign = params.get("utm_campaign") || "";
        const utmTerm = params.get("utm_term") || "";
        const utmContent = params.get("utm_content") || "";
        const gclid = params.get("gclid") || "";
        if (utmSource) payloadObject.utm_source = utmSource;
        if (utmMedium) payloadObject.utm_medium = utmMedium;
        if (utmCampaign) payloadObject.utm_campaign = utmCampaign;
        if (utmTerm) payloadObject.utm_term = utmTerm;
        if (utmContent) payloadObject.utm_content = utmContent;
        if (gclid) payloadObject.gclid = gclid;

        const payload = JSON.stringify(payloadObject);

        try {
            if (navigator.sendBeacon) {
                const blob = new Blob([payload], { type: "application/json" });
                const sent = navigator.sendBeacon("/api/analytics/track", blob);
                if (sent) return;
            }
        } catch {
            // fallback to fetch
        }

        void fetch("/api/analytics/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
            credentials: "same-origin",
        }).catch(() => undefined);
    }, [pathname]);

    return null;
}

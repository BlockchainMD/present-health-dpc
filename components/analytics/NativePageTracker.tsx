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
    const lastTrackedPathRef = useRef<string>("");

    useEffect(() => {
        const path = String(pathname || "/");
        if (!path || shouldSkipPath(path)) return;
        if (lastTrackedPathRef.current === path) return;
        lastTrackedPathRef.current = path;

        const payload = JSON.stringify({ path });

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

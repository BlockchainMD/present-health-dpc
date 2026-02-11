import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { exchangeGoogleOAuthCode } from "@/lib/analytics-dashboard";

export const runtime = "nodejs";

const OAUTH_STATE_COOKIE = "analytics_google_oauth_state";

function redirectToAdmin(request: NextRequest, params?: Record<string, string>) {
    const url = new URL("/admin/analytics", request.url);
    for (const [key, value] of Object.entries(params || {})) {
        url.searchParams.set(key, value);
    }
    return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return redirectToAdmin(request, { oauth: "unauthorized" });
    }

    const searchParams = request.nextUrl.searchParams;
    const code = String(searchParams.get("code") || "").trim();
    const returnedState = String(searchParams.get("state") || "").trim();
    const oauthError = String(searchParams.get("error") || "").trim();

    const cookieStore = await cookies();
    const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value || "";
    cookieStore.delete(OAUTH_STATE_COOKIE);

    if (oauthError) {
        return redirectToAdmin(request, {
            oauth: "error",
            reason: oauthError,
        });
    }

    if (!code) {
        return redirectToAdmin(request, { oauth: "error", reason: "missing_code" });
    }

    if (!returnedState || !expectedState || returnedState !== expectedState) {
        return redirectToAdmin(request, { oauth: "error", reason: "state_mismatch" });
    }

    try {
        await exchangeGoogleOAuthCode(code);
        return redirectToAdmin(request, { oauth: "connected" });
    } catch (error: any) {
        return redirectToAdmin(request, {
            oauth: "error",
            reason: error?.message ? String(error.message).slice(0, 120) : "exchange_failed",
        });
    }
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { buildGoogleAnalyticsAuthUrl, createAnalyticsOAuthState } from "@/lib/analytics-dashboard";

export const runtime = "nodejs";

const OAUTH_STATE_COOKIE = "analytics_google_oauth_state";
const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const state = createAnalyticsOAuthState();
        const authUrl = buildGoogleAnalyticsAuthUrl(state);

        const cookieStore = await cookies();
        cookieStore.set({
            name: OAUTH_STATE_COOKIE,
            value: state,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
        });

        return NextResponse.redirect(authUrl);
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to start OAuth connection" },
            { status: 500 }
        );
    }
}

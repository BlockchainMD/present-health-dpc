import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { runContentRefreshDetection } from "@/lib/content-refresh";

export const runtime = "nodejs";

async function verifyDetectAuth(request: NextRequest) {
    const secret = process.env.CONTENT_REFRESH_CRON_SECRET || process.env.CONTENT_ENGINE_CRON_SECRET || "";
    if (secret) {
        const header = request.headers.get("x-refresh-secret") || request.headers.get("x-cron-secret") || "";
        const bearer = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
        if (header === secret || bearer === secret) return { authorized: true, actorUserId: null as string | null };
    }

    try {
        const session = await requireAdmin();
        return { authorized: true, actorUserId: (session as any)?.user?.id || null };
    } catch {
        return { authorized: false, actorUserId: null as string | null };
    }
}

export async function POST(request: NextRequest) {
    const auth = await verifyDetectAuth(request);
    if (!auth.authorized) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await runContentRefreshDetection({ actorUserId: auth.actorUserId });
        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        return NextResponse.json(
            {
                success: false,
                error: error?.message || "Failed to run content refresh detection",
            },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from "next/server";

import { getTrackingPixelBinary, markAutoResponseOpened } from "@/lib/auto-response";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get("token") || "";
    try {
        if (token) {
            await markAutoResponseOpened(token);
        }
    } catch (error) {
        console.error("[AutoResponseOpenAPI] GET error:", error);
    }

    return new NextResponse(getTrackingPixelBinary(), {
        status: 200,
        headers: {
            "Content-Type": "image/gif",
            "Cache-Control": "no-store, max-age=0",
        },
    });
}

import { NextRequest, NextResponse } from "next/server";

import { markAutoResponseClicked } from "@/lib/auto-response";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get("token") || "";

    try {
        const target = await markAutoResponseClicked(token);
        if (!target) {
            return NextResponse.redirect(new URL("/", request.url));
        }
        return NextResponse.redirect(target);
    } catch (error) {
        console.error("[AutoResponseClickAPI] GET error:", error);
        return NextResponse.redirect(new URL("/", request.url));
    }
}

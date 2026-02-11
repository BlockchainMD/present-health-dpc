import { NextResponse } from "next/server";

import { listServedStates } from "@/lib/state-availability";

export const runtime = "nodejs";

export async function GET() {
    try {
        const states = await listServedStates();
        return NextResponse.json({ success: true, states });
    } catch (error) {
        console.error("[PublicActiveStatesAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load active states" }, { status: 500 });
    }
}


import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { upsertUnifiedLeadFromWaitlistSignup } from "@/lib/unified-leads";
import { queueAutoResponseFromWaitlistSignup } from "@/lib/auto-response";

export const runtime = "nodejs";

function isValidEmail(email: string) {
    // Intentionally simple. We just need to prevent obvious garbage.
    if (!email || email.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function wantsJson(request: NextRequest) {
    const accept = request.headers.get("accept") || "";
    return accept.includes("application/json");
}

export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get("content-type") || "";

        let emailRaw = "";
        let stateInterestRaw = "";
        let honeypot = "";

        if (contentType.includes("application/json")) {
            const body = await request.json().catch(() => null);
            const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
            emailRaw = typeof payload?.email === "string" ? payload.email : "";
            stateInterestRaw = typeof payload?.stateInterest === "string" ? payload.stateInterest : "";
            honeypot = typeof payload?.hp === "string" ? payload.hp : "";
        } else {
            const form = await request.formData();
            emailRaw = String(form.get("email") || "");
            stateInterestRaw = String(form.get("stateInterest") || "");
            honeypot = String(form.get("hp") || "");
        }

        const email = emailRaw.trim().toLowerCase();
        const stateInterestTrimmed = stateInterestRaw.trim();
        const stateInterest = stateInterestTrimmed ? slugify(stateInterestTrimmed) : null;

        if (honeypot && honeypot.trim()) {
            // Bot submission. Pretend success.
            if (wantsJson(request)) return NextResponse.json({ success: true });
            return NextResponse.redirect(new URL("/states?waitlist=1", request.url));
        }

        if (!isValidEmail(email)) {
            if (wantsJson(request)) return NextResponse.json({ success: false, error: "Invalid email" }, { status: 400 });
            return NextResponse.redirect(new URL("/states?waitlist_error=invalid-email", request.url));
        }

        const signup = await prisma.waitlistSignup.upsert({
            where: { email },
            update: stateInterest ? { stateInterest } : {},
            create: { email, stateInterest },
        });

        void upsertUnifiedLeadFromWaitlistSignup(signup, true).catch((error) => {
            console.error("[WaitlistAPI] Failed to sync unified lead", error);
        });

        void queueAutoResponseFromWaitlistSignup(signup).catch((error) => {
            console.error("[WaitlistAPI] Failed to queue auto-response", error);
        });

        if (wantsJson(request)) return NextResponse.json({ success: true });
        return NextResponse.redirect(new URL("/states?waitlist=1", request.url));
    } catch (error) {
        console.error("[WaitlistAPI] POST error:", error);
        if (wantsJson(request)) return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
        return NextResponse.redirect(new URL("/states?waitlist_error=server", request.url));
    }
}

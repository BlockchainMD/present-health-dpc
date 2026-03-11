import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { recordConversionEvent } from "@/lib/conversion";
import { parseMemberSetupToken } from "@/lib/member-account-setup";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

function cleanString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
        }

        const token = cleanString((body as Record<string, unknown>).token);
        const sessionId = cleanString((body as Record<string, unknown>).sessionId);
        const password = cleanString((body as Record<string, unknown>).password);
        if ((!token && !sessionId) || !password) {
            return NextResponse.json({ message: "Token or session is required, along with a password." }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ message: "Password must be at least 8 characters." }, { status: 400 });
        }

        let userId = "";
        let email = "";
        let attributionSessionId: string | null = null;
        let setupFlow: "token" | "session" = "token";

        if (token) {
            const payload = parseMemberSetupToken(token);
            if (!payload) {
                return NextResponse.json({ message: "This account setup link is invalid or expired." }, { status: 400 });
            }

            const existingUser = await prisma.user.findUnique({
                where: { id: payload.userId },
                select: { id: true, email: true, leadId: true, attributionSessionId: true },
            });
            if (!existingUser || existingUser.email !== payload.email) {
                return NextResponse.json({ message: "This account setup link is invalid or expired." }, { status: 400 });
            }

            userId = existingUser.id;
            email = existingUser.email;
            attributionSessionId = existingUser.attributionSessionId;
        } else {
            setupFlow = "session";

            const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
            if (checkoutSession.status !== "complete" || !checkoutSession.subscription) {
                return NextResponse.json({ message: "This checkout is not ready for account setup yet." }, { status: 400 });
            }
            if (checkoutSession.metadata?.requiresPasswordSetup !== "true") {
                return NextResponse.json({ message: "This checkout does not require account setup here." }, { status: 400 });
            }

            userId = cleanString(checkoutSession.metadata?.userId);
            email = String(checkoutSession.customer_details?.email || checkoutSession.customer_email || "").trim().toLowerCase();
            if (!userId || !email) {
                return NextResponse.json({ message: "This checkout is missing account details." }, { status: 400 });
            }

            const subscription = await stripe.subscriptions.retrieve(checkoutSession.subscription as string);
            const existingUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, leadId: true, attributionSessionId: true },
            });
            if (!existingUser || existingUser.email !== email) {
                return NextResponse.json({ message: "This checkout does not match an account waiting for setup." }, { status: 400 });
            }

            attributionSessionId = existingUser.attributionSessionId || cleanString(checkoutSession.metadata?.attributionSessionId) || null;

            await prisma.user.update({
                where: { id: userId },
                data: {
                    stripeCustomerId: String(subscription.customer || ""),
                    stripeSubscriptionId: subscription.id,
                    subscriptionStatus: "active",
                    attributionSessionId,
                },
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
            select: { id: true, email: true, leadId: true, attributionSessionId: true },
        });

        await recordConversionEvent({
            type: "ACCOUNT_SETUP_COMPLETED",
            attributionSessionId: user.attributionSessionId,
            userId: user.id,
            leadId: user.leadId,
            metadata: {
                source: "AccountSetupAPI",
                setupFlow,
            },
        });

        return NextResponse.json({ success: true, email: user.email });
    } catch (error) {
        console.error("[AccountSetupAPI] Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

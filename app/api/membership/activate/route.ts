import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { stopFoundingMemberNurtureSequenceForEmail } from "@/lib/auto-response";
import { recordConversionEvent } from "@/lib/conversion";
import { parseMemberActivationToken } from "@/lib/member-activation";
import { normalizeCoverageType } from "@/lib/pricing";
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

        const password = cleanString((body as Record<string, unknown>).password);
        const token = cleanString((body as Record<string, unknown>).token);
        const sessionIdRaw = cleanString((body as Record<string, unknown>).sessionId);

        if (password.length < 8) {
            return NextResponse.json({ message: "Password must be at least 8 characters." }, { status: 400 });
        }

        const tokenPayload = token ? parseMemberActivationToken(token) : null;
        if (token && !tokenPayload) {
            return NextResponse.json({ message: "Activation link is invalid or expired." }, { status: 400 });
        }

        const sessionId = tokenPayload?.sessionId || sessionIdRaw;
        if (!sessionId) {
            return NextResponse.json({ message: "Missing activation session." }, { status: 400 });
        }

        const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
        if (checkoutSession.status !== "complete" || !checkoutSession.subscription) {
            return NextResponse.json({ message: "Checkout is not complete yet." }, { status: 400 });
        }

        const email = String(checkoutSession.customer_details?.email || checkoutSession.customer_email || checkoutSession.metadata?.email || "")
            .trim()
            .toLowerCase();
        if (!email) {
            return NextResponse.json({ message: "Checkout email is missing." }, { status: 400 });
        }

        if (tokenPayload && tokenPayload.email !== email) {
            return NextResponse.json({ message: "Activation link does not match this checkout." }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
        if (existingUser?.id) {
            return NextResponse.json({ message: "An account already exists for this email. Sign in instead." }, { status: 409 });
        }

        const subscription = await stripe.subscriptions.retrieve(checkoutSession.subscription as string);
        const hashedPassword = await bcrypt.hash(password, 10);
        const name = [checkoutSession.metadata?.firstName, checkoutSession.metadata?.lastName].filter(Boolean).join(" ").trim() || null;
        const campaignLeadId = cleanString(checkoutSession.metadata?.campaignLeadId) || null;
        const attributionSessionId = cleanString(checkoutSession.metadata?.attributionSessionId) || null;
        const plan = normalizeCoverageType(checkoutSession.metadata?.plan);
        const billing = checkoutSession.metadata?.billing === "annual" ? "annual" : "monthly";
        const monthlyRateRaw = Number.parseInt(String(checkoutSession.metadata?.monthlyRate || ""), 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                stripeCustomerId: String(subscription.customer || ""),
                stripeSubscriptionId: subscription.id,
                subscriptionStatus: "active",
                attributionSessionId,
                leadId: campaignLeadId,
            },
        });

        await stopFoundingMemberNurtureSequenceForEmail(email, "registered_member");

        await recordConversionEvent({
            type: "REGISTERED",
            attributionSessionId,
            userId: user.id,
            leadId: campaignLeadId,
            metadata: {
                source: "MembershipActivationAPI",
                checkoutMode: "guest",
                checkoutSessionId: checkoutSession.id,
                stripeSubscriptionId: subscription.id,
                state: checkoutSession.metadata?.state || null,
                plan,
                billing,
                monthlyRate: Number.isFinite(monthlyRateRaw) ? monthlyRateRaw : null,
            },
        });

        return NextResponse.json({
            success: true,
            email,
        });
    } catch (error) {
        console.error("[MembershipActivationAPI] Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

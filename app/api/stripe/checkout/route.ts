import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_TIERS, normalizeCoverageType } from "@/lib/pricing";
import { resolveServedState } from "@/lib/state-availability";
import { getOrCreateAttributionSession } from "@/lib/attribution";
import { recordConversionEvent } from "@/lib/conversion";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json().catch(() => null);
        const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
        const planRaw = payload.plan;
        const plan = normalizeCoverageType(planRaw);
        const stateRaw = typeof payload.state === "string" ? payload.state.trim() : "";
        if (!stateRaw) {
            return NextResponse.json({ message: "State is required before checkout." }, { status: 400 });
        }

        const servedState = await resolveServedState(stateRaw);
        if (!servedState) {
            return NextResponse.json(
                {
                    message:
                        "Present Health is not yet available in your state. Join the waitlist and we will notify you when access opens.",
                },
                { status: 400 }
            );
        }

        const attributionSessionId = await getOrCreateAttributionSession(req);

        const tier = MEMBERSHIP_TIERS[plan];
        const unitAmount = tier.monthlyDollars * 100;
        const productName = `${tier.name} Membership`;

        const checkoutSession = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Present Health - ${productName}`,
                        },
                        unit_amount: unitAmount,
                        recurring: {
                            interval: 'month',
                        },
                    },
                    quantity: 1,
                },
            ],
            customer_email: session.user.email!,
            metadata: {
                userId: session.user.id,
                attributionSessionId: attributionSessionId || "",
                plan,
                state: servedState.name,
                monthlyRate: String(tier.monthlyDollars),
            },
            success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
            cancel_url: `${process.env.NEXTAUTH_URL}/dashboard?canceled=true`,
        });

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { leadId: true },
        });

        await recordConversionEvent({
            type: "CHECKOUT_STARTED",
            attributionSessionId: attributionSessionId,
            userId: session.user.id,
            leadId: user?.leadId || null,
            metadata: {
                source: "StripeCheckoutAPI",
                plan,
                state: servedState.name,
                monthlyRate: tier.monthlyDollars,
                checkoutSessionId: checkoutSession.id,
            },
        });

        return NextResponse.json({ url: checkoutSession.url });
    } catch (error) {
        console.error("Stripe Checkout error:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}

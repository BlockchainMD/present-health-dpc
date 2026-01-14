import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { recordConversionEvent } from "@/lib/conversion";

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get("Stripe-Signature") as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (error: any) {
        return NextResponse.json(
            { message: `Webhook Error: ${error.message}` },
            { status: 400 }
        );
    }

    // Idempotency: Upsert StripeEvent and check if processed
    const stripeEvent = await prisma.stripeEvent.upsert({
        where: { stripeEventId: event.id },
        update: {},
        create: {
            stripeEventId: event.id,
            type: event.type,
            metadata: event as any,
        }
    });

    if (stripeEvent.processedAt) {
        console.log(`[StripeWebhook] Duplicate event ignored: ${event.id}`);
        return NextResponse.json({ received: true, duplicate: true });
    }

    console.log(`[StripeWebhook] Processing event: ${event.id} type: ${event.type}`);

    const session = event.data.object as Stripe.Checkout.Session;

    if (event.type === "checkout.session.completed") {
        const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
        );

        if (!session?.metadata?.userId) {
            return NextResponse.json(
                { message: "User ID is missing from metadata" },
                { status: 400 }
            );
        }

        // Find user and their attribution info
        const user = await prisma.user.findUnique({
            where: { id: session.metadata.userId },
            select: { id: true, leadId: true, attributionSessionId: true }
        });

        await prisma.user.update({
            where: {
                id: session.metadata.userId,
            },
            data: {
                stripeCustomerId: subscription.customer as string,
                stripeSubscriptionId: subscription.id,
                subscriptionStatus: "active",
            },
        });

        // Record Conversion Event with enriched metadata
        await recordConversionEvent({
            type: 'STRIPE_SUBSCRIBED',
            attributionSessionId: session.metadata.attributionSessionId || user?.attributionSessionId,
            userId: session.metadata.userId,
            leadId: user?.leadId,
            metadata: {
                stripeSubscriptionId: subscription.id,
                stripeEventId: event.id,
                leadId: user?.leadId,
                attributionSessionId: user?.attributionSessionId || session.metadata.attributionSessionId
            }
        });

        await recordConversionEvent({
            type: 'MEMBER_ACTIVE',
            attributionSessionId: session.metadata.attributionSessionId || user?.attributionSessionId,
            userId: session.metadata.userId,
            leadId: user?.leadId,
            metadata: { source: 'StripeWebhook' }
        });
    }

    if (event.type === "invoice.payment_failed") {
        const invoice = event.data.object as Stripe.Invoice;
        // Find user by subscription ID and update status
        // This is a bit trickier without storing the sub ID first, but for now we assume it's there
        // or we can look up by customer ID if we had it.
        // For MVP, we'll skip complex logic here.
    }

    // Mark event as processed
    try {
        await prisma.stripeEvent.update({
            where: { stripeEventId: event.id },
            data: { processedAt: new Date() }
        });
    } catch (err) {
        console.error("[StripeWebhook] Failed to mark event as processed:", err);
    }

    return NextResponse.json({ result: event, ok: true });
}

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const prisma = new PrismaClient();

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
    }

    if (event.type === "invoice.payment_failed") {
        const invoice = event.data.object as Stripe.Invoice;
        // Find user by subscription ID and update status
        // This is a bit trickier without storing the sub ID first, but for now we assume it's there
        // or we can look up by customer ID if we had it.
        // For MVP, we'll skip complex logic here.
    }

    return NextResponse.json({ result: event, ok: true });
}

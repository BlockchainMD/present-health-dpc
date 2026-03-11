import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { recordConversionEvent } from "@/lib/conversion";
import { MEMBERSHIP_TIERS, normalizeCoverageType } from "@/lib/pricing";
import {
    upsertUnifiedLeadFromCampaignLead,
    upsertUnifiedLeadFromWebsiteRegistration,
} from "@/lib/unified-leads";
import { UnifiedLeadMembershipTier, UnifiedLeadStatus } from "@prisma/client";

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
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown webhook error";
        return NextResponse.json(
            { message: `Webhook Error: ${message}` },
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
            metadata: JSON.parse(JSON.stringify(event)),
        }
    });

    if (stripeEvent.processedAt) {
        console.log(`[StripeWebhook] Duplicate event ignored: ${event.id}`);
        return NextResponse.json({ received: true, duplicate: true });
    }

    console.log(`[StripeWebhook] Processing event: ${event.id} type: ${event.type}`);

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
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

        const plan = normalizeCoverageType(session.metadata.plan);
        const billing = session.metadata.billing === "annual" ? "annual" : "monthly";
        const membershipTier = UnifiedLeadMembershipTier.INDIVIDUAL;
        const monthlyRate = MEMBERSHIP_TIERS[plan].monthlyDollars;
        const normalizedEmail = String(session.customer_details?.email || session.customer_email || "").trim().toLowerCase();

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

        if (user?.leadId) {
            await prisma.lead.updateMany({
                where: { id: user.leadId },
                data: {
                    status: "CONVERTED",
                    convertedAt: new Date(),
                },
            });

            const campaignLead = await prisma.lead.findUnique({
                where: { id: user.leadId },
                include: {
                    campaignRun: {
                        select: {
                            campaign: {
                                select: { landingSlug: true },
                            },
                        },
                    },
                },
            });
            if (campaignLead) {
                await upsertUnifiedLeadFromCampaignLead(campaignLead, false);
            }
        }

        if (normalizedEmail) {
            await upsertUnifiedLeadFromWebsiteRegistration(
                {
                    sourceRecordId: `register:${normalizedEmail}`,
                    email: normalizedEmail,
                    state: session.metadata.state || null,
                    sourcePage: "/register",
                    membershipTier,
                    monthlyMembershipRate: monthlyRate,
                    suggestedStatus: UnifiedLeadStatus.ENROLLED,
                    sourceMeta: {
                        stripeCustomerId: String(subscription.customer || ""),
                        stripeSubscriptionId: subscription.id,
                        userId: session.metadata.userId,
                        billing,
                    },
                },
                false
            );
        }

        await recordConversionEvent({
            type: "CHECKOUT_COMPLETED",
            attributionSessionId: session.metadata.attributionSessionId || user?.attributionSessionId,
            userId: session.metadata.userId,
            leadId: user?.leadId,
            metadata: {
                stripeSubscriptionId: subscription.id,
                stripeEventId: event.id,
                leadId: user?.leadId,
                attributionSessionId: user?.attributionSessionId || session.metadata.attributionSessionId,
                plan,
                billing,
                monthlyRate,
                state: session.metadata.state || null,
            }
        });

        await recordConversionEvent({
            type: "SUBSCRIPTION_STARTED",
            attributionSessionId: session.metadata.attributionSessionId || user?.attributionSessionId,
            userId: session.metadata.userId,
            leadId: user?.leadId,
            metadata: {
                source: "StripeWebhook",
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: String(subscription.customer || ""),
            },
        });

        await recordConversionEvent({
            type: "MEMBER_ACTIVE",
            attributionSessionId: session.metadata.attributionSessionId || user?.attributionSessionId,
            userId: session.metadata.userId,
            leadId: user?.leadId,
            metadata: {
                source: "StripeWebhook",
                plan,
                billing,
                monthlyRate,
                state: session.metadata.state || null,
            },
        });
    }

    if (event.type === "invoice.paid") {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
        if (customerId) {
            await prisma.user.updateMany({
                where: { stripeCustomerId: customerId },
                data: { subscriptionStatus: "active" },
            });
        }
        await recordConversionEvent({
            type: "INVOICE_PAID",
            metadata: {
                source: "StripeWebhook",
                stripeInvoiceId: invoice.id,
                stripeCustomerId: customerId,
                amountPaid: invoice.amount_paid,
                billingReason: invoice.billing_reason,
            },
        });
    }

    if (event.type === "invoice.payment_failed") {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
        if (customerId) {
            await prisma.user.updateMany({
                where: { stripeCustomerId: customerId },
                data: { subscriptionStatus: "past_due" },
            });
        }
        await recordConversionEvent({
            type: "PAYMENT_FAILED",
            metadata: {
                source: "StripeWebhook",
                stripeInvoiceId: invoice.id,
                stripeCustomerId: customerId,
                amountDue: invoice.amount_due,
            },
        });
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

import crypto from "crypto";

import { UnifiedLeadMembershipTier } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getOrCreateAttributionSession } from "@/lib/attribution";
import { recordConversionEvent } from "@/lib/conversion";
import { MEMBERSHIP_ANNUAL_DOLLARS, MEMBERSHIP_TIERS, normalizeBillingCadence, normalizeCoverageType } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/site-url";
import { resolveServedState } from "@/lib/state-availability";
import { stripe } from "@/lib/stripe";
import { upsertUnifiedLeadFromWebsiteRegistration } from "@/lib/unified-leads";

function cleanString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const body = await req.json().catch(() => null);
        const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
        const plan = normalizeCoverageType(payload.plan);
        const billing = normalizeBillingCadence(payload.billing);
        const stateRaw = cleanString(payload.state);

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

        let userId = cleanString((session?.user as { id?: string } | undefined)?.id);
        let checkoutEmail = cleanString(session?.user?.email);
        let leadId: string | null = null;
        let guestCheckout = !userId;

        if (guestCheckout) {
            const firstName = cleanString(payload.firstName);
            const lastName = cleanString(payload.lastName);
            const email = cleanString(payload.email).toLowerCase();
            const phone = cleanString(payload.phone);

            if (!firstName || !lastName || !email) {
                return NextResponse.json(
                    { message: "First name, last name, and email are required before checkout." },
                    { status: 400 }
                );
            }

            const existingUser = await prisma.user.findUnique({
                where: { email },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    leadId: true,
                    subscriptionStatus: true,
                },
            });

            if (existingUser?.subscriptionStatus === "active") {
                return NextResponse.json(
                    { message: "An active membership already exists for this email. Please sign in instead." },
                    { status: 409 }
                );
            }

            await upsertUnifiedLeadFromWebsiteRegistration(
                {
                    sourceRecordId: `register:${email}`,
                    email,
                    firstName,
                    lastName,
                    phone: phone || null,
                    state: servedState.name,
                    sourcePage: "/register",
                    membershipTier: UnifiedLeadMembershipTier.INDIVIDUAL,
                    monthlyMembershipRate: tier.monthlyDollars,
                    sourceMeta: {
                        plan,
                        billing,
                        stateRequested: stateRaw,
                        checkoutFlow: "guest_checkout",
                    },
                },
                true
            );

            if (existingUser) {
                const fullName = `${firstName} ${lastName}`.trim();
                const updated = await prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                        name: existingUser.name || fullName,
                        attributionSessionId: attributionSessionId || undefined,
                    },
                    select: { id: true, email: true, leadId: true },
                });
                userId = updated.id;
                checkoutEmail = updated.email;
                leadId = updated.leadId || null;
            } else {
                const password = crypto.randomBytes(24).toString("hex");
                const hashedPassword = await bcrypt.hash(password, 10);
                const created = await prisma.user.create({
                    data: {
                        name: `${firstName} ${lastName}`.trim(),
                        email,
                        password: hashedPassword,
                        role: "USER",
                        attributionSessionId: attributionSessionId || null,
                    },
                    select: { id: true, email: true, leadId: true },
                });
                userId = created.id;
                checkoutEmail = created.email;
                leadId = created.leadId || null;
            }
        } else {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, leadId: true },
            });
            checkoutEmail = cleanString(user?.email) || checkoutEmail;
            leadId = user?.leadId || null;
            guestCheckout = false;
        }

        if (!userId || !checkoutEmail) {
            return NextResponse.json({ message: "Unable to prepare checkout for this account." }, { status: 400 });
        }

        const unitAmount = (billing === "annual" ? MEMBERSHIP_ANNUAL_DOLLARS : tier.monthlyDollars) * 100;
        const productName = `${tier.name} Membership (${billing === "annual" ? "Annual" : "Monthly"})`;
        const successUrl = guestCheckout
            ? absoluteUrl("/setup-account?checkout=success")
            : absoluteUrl("/dashboard?success=true");
        const cancelUrl = guestCheckout
            ? absoluteUrl(`/register?plan=${encodeURIComponent(plan)}&billing=${encodeURIComponent(billing)}&canceled=true`)
            : absoluteUrl("/dashboard?canceled=true");

        const checkoutSession = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: `Present Health - ${productName}`,
                        },
                        unit_amount: unitAmount,
                        recurring: {
                            interval: billing === "annual" ? "year" : "month",
                        },
                    },
                    quantity: 1,
                },
            ],
            customer_email: checkoutEmail,
            metadata: {
                userId,
                attributionSessionId: attributionSessionId || "",
                plan,
                billing,
                state: servedState.name,
                monthlyRate: String(tier.monthlyDollars),
                checkoutFlow: guestCheckout ? "guest" : "authenticated",
                requiresPasswordSetup: guestCheckout ? "true" : "false",
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
        });

        await recordConversionEvent({
            type: "CHECKOUT_STARTED",
            attributionSessionId,
            userId,
            leadId,
            metadata: {
                source: "StripeCheckoutAPI",
                plan,
                billing,
                state: servedState.name,
                monthlyRate: tier.monthlyDollars,
                checkoutSessionId: checkoutSession.id,
                checkoutFlow: guestCheckout ? "guest" : "authenticated",
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

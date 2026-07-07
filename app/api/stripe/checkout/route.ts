import { UnifiedLeadMembershipTier } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getOrCreateAttributionSession } from "@/lib/attribution";
import { recordConversionEvent } from "@/lib/conversion";
import { MEMBERSHIP_TIERS, normalizeBillingCadence, normalizeCoverageType, type CoverageType } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/site-url";
import { resolveServedState } from "@/lib/state-availability";
import { stripe } from "@/lib/stripe";
import { upsertUnifiedLeadFromCampaignLead, upsertUnifiedLeadFromWebsiteRegistration } from "@/lib/unified-leads";

const MEMBERSHIP_TIER_ENUM: Record<CoverageType, UnifiedLeadMembershipTier> = {
    individual: UnifiedLeadMembershipTier.INDIVIDUAL,
    couple: UnifiedLeadMembershipTier.COUPLE,
    family: UnifiedLeadMembershipTier.FAMILY,
};

function cleanString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const body = await req.json().catch(() => null);
        const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

        const plan = normalizeCoverageType(payload.plan);
        const billing = normalizeBillingCadence(payload.billing);
        const stateRaw = cleanString(payload.state);
        const firstName = cleanString(payload.firstName);
        const lastName = cleanString(payload.lastName);
        const email = cleanString(payload.email).toLowerCase();
        const phone = cleanString(payload.phone);
        const hasGuestIdentity = Boolean(firstName && lastName && email);

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
        const unitAmount = (billing === "annual" ? tier.annualDollars : tier.monthlyDollars) * 100;
        const productName = `${tier.name} Membership (${billing === "annual" ? "Annual" : "Monthly"})`;

        if (hasGuestIdentity) {
            if (!isValidEmail(email)) {
                return NextResponse.json({ message: "Enter a valid email address before checkout." }, { status: 400 });
            }

            if (!firstName || !lastName) {
                return NextResponse.json(
                    { message: "First name, last name, and email are required before checkout." },
                    { status: 400 }
                );
            }

            const existingUser = await prisma.user.findUnique({
                where: { email },
                select: { id: true },
            });
            if (existingUser?.id) {
                return NextResponse.json(
                    { message: "An account already exists for this email. Sign in to continue." },
                    { status: 409 }
                );
            }

            const campaignLead = await prisma.lead.findFirst({
                where: { email },
                orderBy: { createdAt: "desc" },
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
                const mergedMetadata =
                    campaignLead.metadata && typeof campaignLead.metadata === "object" && !Array.isArray(campaignLead.metadata)
                        ? {
                            ...(campaignLead.metadata as Record<string, unknown>),
                            firstName,
                            lastName,
                            state: servedState.name,
                            plan,
                            billing,
                            sourcePage: "/register",
                        }
                        : {
                            firstName,
                            lastName,
                            state: servedState.name,
                            plan,
                            billing,
                            sourcePage: "/register",
                        };

                const updatedCampaignLead = await prisma.lead.update({
                    where: { id: campaignLead.id },
                    data: { metadata: mergedMetadata },
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

                await upsertUnifiedLeadFromCampaignLead(updatedCampaignLead, true);
            } else {
                await upsertUnifiedLeadFromWebsiteRegistration(
                    {
                        email,
                        firstName,
                        lastName,
                        phone: phone || null,
                        state: servedState.name,
                        sourcePage: "/register",
                        sourceRecordId: `register:${email}`,
                        membershipTier: MEMBERSHIP_TIER_ENUM[plan],
                        monthlyMembershipRate: tier.monthlyDollars,
                        sourceMeta: {
                            plan,
                            billing,
                            checkoutMode: "guest",
                        },
                    },
                    true
                );
            }

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
                customer_email: email,
                metadata: {
                    checkoutMode: "guest",
                    attributionSessionId: attributionSessionId || "",
                    campaignLeadId: campaignLead?.id || "",
                    email,
                    firstName,
                    lastName,
                    phone,
                    plan,
                    billing,
                    state: servedState.name,
                    monthlyRate: String(tier.monthlyDollars),
                },
                success_url: absoluteUrl("/activate?session_id={CHECKOUT_SESSION_ID}"),
                cancel_url: absoluteUrl(`/register?plan=${encodeURIComponent(plan)}&billing=${encodeURIComponent(billing)}&canceled=true`),
            });

            await recordConversionEvent({
                type: "CHECKOUT_STARTED",
                attributionSessionId,
                leadId: campaignLead?.id || null,
                metadata: {
                    source: "GuestMembershipCheckoutAPI",
                    plan,
                    billing,
                    state: servedState.name,
                    monthlyRate: tier.monthlyDollars,
                    checkoutMode: "guest",
                    checkoutSessionId: checkoutSession.id,
                },
            });

            return NextResponse.json({ url: checkoutSession.url });
        }

        if (!session?.user?.id) {
            return NextResponse.json(
                { message: "Complete the form before checkout or sign in again." },
                { status: 401 }
            );
        }

        const signedInUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                email: true,
                leadId: true,
            },
        });

        if (!signedInUser?.email || !isValidEmail(signedInUser.email)) {
            return NextResponse.json(
                { message: "Your signed-in account email is invalid. Sign out and complete the form again." },
                { status: 400 }
            );
        }

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
            customer_email: signedInUser.email,
            metadata: {
                userId: signedInUser.id,
                attributionSessionId: attributionSessionId || "",
                plan,
                billing,
                state: servedState.name,
                monthlyRate: String(tier.monthlyDollars),
            },
            success_url: absoluteUrl("/dashboard?success=true"),
            cancel_url: absoluteUrl("/dashboard?canceled=true"),
        });

        await recordConversionEvent({
            type: "CHECKOUT_STARTED",
            attributionSessionId,
            userId: signedInUser.id,
            leadId: signedInUser.leadId || null,
            metadata: {
                source: "StripeCheckoutAPI",
                plan,
                billing,
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

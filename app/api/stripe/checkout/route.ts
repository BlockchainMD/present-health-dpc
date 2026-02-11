import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { cookies } from "next/headers";
import { ENROLLMENT_FEE_DOLLARS, MEMBERSHIP_TIERS, normalizeCoverageType } from "@/lib/pricing";

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

        const tier = MEMBERSHIP_TIERS[plan];
        const unitAmount = tier.monthlyDollars * 100;
        const productName = `${tier.name} Membership`;
        const enrollmentFeeAmount = ENROLLMENT_FEE_DOLLARS * 100;

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
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: "Present Health - Enrollment fee",
                        },
                        unit_amount: enrollmentFeeAmount,
                    },
                    quantity: 1,
                },
            ],
            customer_email: session.user.email!,
            metadata: {
                userId: session.user.id,
                attributionSessionId: (await cookies()).get('ph_attrib')?.value || '',
                plan,
            },
            success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
            cancel_url: `${process.env.NEXTAUTH_URL}/dashboard?canceled=true`,
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

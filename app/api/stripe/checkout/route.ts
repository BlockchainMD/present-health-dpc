import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const { plan } = await req.json();

        // Define price IDs (You would typically store these in your DB or config)
        // For this demo, we'll create them on the fly or use a lookup
        // Ideally, you should create Products/Prices in your Stripe Dashboard and use those IDs.
        // Since we don't have them, we will use 'price_data' to create them inline for this MVP.

        const unitAmount = plan === 'family' ? 27900 : 12900;
        const productName = plan === 'family' ? 'Family Plan' : 'Individual Plan';

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

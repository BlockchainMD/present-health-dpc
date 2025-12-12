import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
    if (!stripeInstance) {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY is not set');
        }
        stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
            typescript: true,
        });
    }
    return stripeInstance;
}

// For backward compatibility - but prefer using getStripe()
export const stripe = {
    get checkout() {
        return getStripe().checkout;
    },
    get customers() {
        return getStripe().customers;
    },
    get subscriptions() {
        return getStripe().subscriptions;
    },
};

import { PricingCards } from "@/components/sections/PricingCards";
import { FAQAccordion } from "@/components/sections/FAQAccordion";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Pricing | Present Health",
    description: "Simple, transparent pricing. HSA/FSA eligible memberships starting at $129/mo.",
};

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="pt-24 pb-12 text-center container px-4 mx-auto">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                    Simple, Transparent Pricing.
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    No hidden fees. No insurance headaches. Just direct access to your doctor.
                </p>
            </div>

            <PricingCards />
            <FAQAccordion />
        </div>
    );
}

import { FAQAccordion } from "@/components/sections/FAQAccordion";
import { CostComparisonCalculator } from "@/components/pricing/CostComparisonCalculator";
import { MembershipTiers } from "@/components/pricing/MembershipTiers";
import { SchemaBlocks } from "@/components/seo/SchemaBlocks";
import { buildPricingSchemas } from "@/lib/schema";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Pricing | Present Health",
    description: "Simple, transparent membership pricing for telehealth-first Direct Primary Care. Individual, couple, and family tiers plus employer options.",
};

export default function PricingPage() {
    const schemaBlocks = buildPricingSchemas();

    return (
        <div className="min-h-screen bg-background">
            <SchemaBlocks blocks={schemaBlocks} idPrefix="pricing" />
            <div className="pt-24 pb-12 text-center container px-4 mx-auto">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                    Simple, Transparent Pricing.
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Telehealth-first Direct Primary Care membership with clear monthly pricing and no hidden fees.
                </p>
            </div>

            <MembershipTiers />
            <CostComparisonCalculator />
            <FAQAccordion />
        </div>
    );
}

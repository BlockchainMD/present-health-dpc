import { FAQAccordion } from "@/components/sections/FAQAccordion";
import { CostComparisonCalculator } from "@/components/pricing/CostComparisonCalculator";
import { MembershipTiers } from "@/components/pricing/MembershipTiers";
import { SchemaBlocks } from "@/components/seo/SchemaBlocks";
import { buildPricingSchemas } from "@/lib/schema";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Pricing | Present Health",
    description:
        "One plan, $99/month or $990/year. Messaging-first primary care with no per-visit fees, plus a $99 single-visit option.",
};

export default function PricingPage() {
    const schemaBlocks = buildPricingSchemas();

    return (
        <div className="min-h-screen bg-background">
            <SchemaBlocks blocks={schemaBlocks} idPrefix="pricing" />
            <div className="pt-24" />
            <MembershipTiers />
            <CostComparisonCalculator />
            <FAQAccordion />
        </div>
    );
}

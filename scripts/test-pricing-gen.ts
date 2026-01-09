
import { generateLandingPage } from '../lib/ads/generator';
import { prisma } from '../lib/prisma';

async function testPricingGeneration() {
    console.log("🚀 Testing Pricing Generation in Landing Pages...");

    try {
        // 1. Get a campaign to test with
        const campaign = await prisma.campaign.findFirst({
            orderBy: { createdAt: 'desc' }
        });

        if (!campaign) {
            console.error("❌ No campaign found in DB to test with.");
            return;
        }

        console.log(`Using campaign: ${campaign.slug} (${campaign.id})`);

        // 2. Trigger generation
        const run = await generateLandingPage(campaign.id);

        // 3. Inspect artifacts
        const content = JSON.parse(run.landingPageContent || '{}');

        console.log("\n--- Generated LP Content ---");
        console.log("Hero Headline:", content.hero?.headline);

        if (content.pricing) {
            console.log("\n✅ Pricing Object Found:");
            console.log("Headline:", content.pricing.headline);
            console.log("Subheadline:", content.pricing.subheadline);
            console.log("Tiers Count:", content.pricing.tiers?.length);
            console.log("Sample Tier:", content.pricing.tiers?.[0]);
        } else {
            console.error("\n❌ Pricing Object MISSING!");
        }

        console.log("\n✅ Test Complete.");

    } catch (error) {
        console.error("💥 Test Failed:", error);
    }
}

testPricingGeneration();

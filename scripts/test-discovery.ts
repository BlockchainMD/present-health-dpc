
import { discoverInlets } from '../lib/ads/discovery';
import { generateCampaignSpec } from '../lib/ads/ai-campaign';
import { generateLandingPageSpec } from '../lib/ads/generator';
import { prisma } from '../lib/prisma';

async function testFullEducationalFlow() {
    console.log("🚀 Testing Full 'Educational Inlet' Flow...");

    try {
        // 1. Discovery
        console.log("\n--- 1. Discovery Phase ---");
        const inlets = await discoverInlets();
        if (inlets.length === 0) {
            console.log("⚠️ No inlets discovered. Try again or check trending/mock logic.");
            return;
        }
        const inlet = inlets[0];
        console.log("Discovered Inlet:", JSON.stringify(inlet, null, 2));

        // 2. Campaign Generation
        console.log("\n--- 2. Campaign Generation Phase ---");
        let spec;
        if (process.env.OPENAI_API_KEY) {
            spec = await generateCampaignSpec('EDUCATIONAL', inlet);
        } else {
            console.warn("⚠️ Missing OPENAI_API_KEY. Using mock spec.");
            spec = {
                slug: "nomad-burnout-prevention",
                persona: inlet.persona,
                intent: inlet.problem,
                seedKeywords: inlet.suggestedKeywords,
                benefits: ["Direct Access to Doctor", "Text Any Time", "No Waiting Rooms"],
                proofPoints: ["10+ Years Experience", "Board Certified"],
                disclaimers: ["Not insurance"],
                budgetDaily: 50,
                targetCpa: 30,
                geo: "US",
                tone: "Professional",
                strategy: "EDUCATIONAL" as const,
                layoutType: "EDUCATIONAL" as const
            };
        }
        console.log("Generated Educational Spec:", JSON.stringify(spec, null, 2));

        // 3. LP Content Generation Phase (Bypassing DB)
        console.log("\n--- 3. LP Content Generation Phase (Mock Spec) ---");
        const content = await generateLandingPageSpec("MOCK_ID", spec);

        console.log("\n✅ Verification Results:");
        console.log("- Strategy:", spec.strategy);
        console.log("- Layout Type:", spec.layoutType);
        console.log("- Educational Briefing Exists:", !!content.educationalBriefing);
        if (content.educationalBriefing) {
            console.log("- Briefing Length:", content.educationalBriefing.length, "chars");
        }
        console.log("- Pricing Section Exists:", !!content.pricing);

        console.log("\n✅ Test Complete.");

    } catch (error) {
        console.error("💥 Flow Test Failed:", error);
    }
}

testFullEducationalFlow();

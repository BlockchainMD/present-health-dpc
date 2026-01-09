
import { generateCampaignSpec } from '../lib/ads/ai-campaign';
import { generateAdAssets } from '../lib/ads/google-ads';
import { generateKeywords } from '../lib/ads/keywords';
import { validateContent } from '../lib/ads/compliance';

async function testFullFlow() {
    console.log("🚀 Starting Ad Engine Test Flow...");

    try {
        // 1. Generate Campaign Spec
        console.log("\n--- 1. Generating Campaign Spec (AI) ---");
        const spec = await generateCampaignSpec();
        console.log(JSON.stringify(spec, null, 2));

        // 2. Generate Keywords
        console.log("\n--- 2. Generating Keywords ---");
        const keywords = generateKeywords(spec.seedKeywords);
        console.log(`Generated ${keywords.length} keywords.`);
        console.log("Samples:", keywords.slice(0, 5));

        // 3. Generate Ad Assets
        console.log("\n--- 3. Generating Ad Assets (Copy Logic) ---");
        const ads = generateAdAssets(spec);
        console.log("Headlines:", ads.headlines);
        console.log("Descriptions:", ads.descriptions);

        // 4. Validate Ad Assets (Final Check)
        console.log("\n--- 4. Final Compliance Check ---");
        ads.headlines.forEach(h => {
            const res = validateContent(h, "Headline");
            if (res.status === 'FAIL') console.error(`❌ Headline FAILED: ${h} - ${res.reasons}`);
        });
        ads.descriptions.forEach(d => {
            const res = validateContent(d, "Description");
            if (res.status === 'FAIL') console.error(`❌ Description FAILED: ${d} - ${res.reasons}`);
        });

        console.log("\n✅ Test Flow Complete.");

    } catch (error) {
        console.error("💥 Test Flow Failed:", error);
    }
}

testFullFlow();


import { generateAdAssets } from '../lib/ads/google-ads';
import { generateKeywords } from '../lib/ads/keywords';
import { validateContent } from '../lib/ads/compliance';

async function testLogicWithMockSpec() {
    console.log("🚀 Starting Ad Engine Logic Test (Mock Spec)...");

    const mockSpec = {
        slug: "digital-nomad-health",
        persona: "Digital Nomads in Bali",
        intent: "Need a doctor who speaks English and understands travel health",
        seedKeywords: ["digital nomad health", "bali doctor", "travel medicine subscription"],
        benefits: ["English-Speaking Doctor", "WhatsApp Access", "Global Care Coordination", "24/7 Support", "Free Ozempic Prescription"], // Very bad terms added
        proofPoints: ["10+ Years Experience", "99% Patient Satisfaction", "Guaranteed Cure"], // More bad terms
        disclaimers: ["Not insurance"]
    };

    try {
        // 1. Generate Keywords
        console.log("\n--- 1. Generating Keywords ---");
        const keywords = generateKeywords(mockSpec.seedKeywords);
        console.log(`Generated ${keywords.length} keywords.`);
        const failures = keywords.filter(k => validateContent(k.keyword).status === 'FAIL');
        if (failures.length > 0) {
            console.error(`❌ Found ${failures.length} non-compliant keywords!`);
        } else {
            console.log("✅ All generated keywords passed compliance.");
        }

        // 2. Generate Ad Assets
        console.log("\n--- 2. Generating Ad Assets ---");
        const ads = generateAdAssets(mockSpec);
        console.log("Headlines:", ads.headlines);
        console.log("Descriptions:", ads.descriptions);

        // 3. Final Compliance Check
        console.log("\n--- 3. Final Compliance Check ---");
        ads.headlines.forEach(h => {
            const res = validateContent(h, "Headline");
            if (res.status === 'FAIL') {
                console.error(`❌ Headline FAILED: "${h}"`);
                console.error(`   Reasons: ${res.reasons.join(', ')}`);
            }
        });

        ads.descriptions.forEach(d => {
            const res = validateContent(d, "Description");
            if (res.status === 'FAIL') {
                console.error(`❌ Description FAILED: "${d}"`);
                console.error(`   Reasons: ${res.reasons.join(', ')}`);
            }
        });

        // Check if we meet Google requirements (Min 3 headlines, 2 descriptions)
        if (ads.headlines.length < 3) console.error("❌ Too few headlines for RSA!");
        if (ads.descriptions.length < 2) console.error("❌ Too few descriptions for RSA!");

    } catch (error) {
        console.error("💥 Test Failed:", error);
    }
}

testLogicWithMockSpec();

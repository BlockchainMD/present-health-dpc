
import { PipelineManager } from '../lib/ads/pipeline';
import { discoverInlets } from '../lib/ads/discovery';
import { generateCampaignSpec } from '../lib/ads/ai-campaign';
import { generateLandingPageSpec } from '../lib/ads/generator';
import { prisma } from '../lib/prisma';

async function testReproducibility() {
    console.log("🚀 Testing Deterministic Pipeline & Reproducibility...");

    try {
        // 0. Setup: Create a real Campaign and CampaignRun to host artifacts
        const campaign = await prisma.campaign.create({
            data: {
                slug: `repro-test-${Date.now()}`,
                persona: "Test Persona",
                intent: "Test Intent",
                seedKeywords: ["test"],
                landingSlug: `test-lp-${Date.now()}`,
                benefits: ["Benefit 1"],
                proofPoints: ["Proof 1"],
                disclaimers: ["Disclaimer 1"],
                budgetDaily: 50,
                targetCpa: 30,
                geo: "US",
                tone: "Professional"
            }
        });

        const run = await prisma.campaignRun.create({
            data: {
                campaignId: campaign.id,
                status: 'DRAFT'
            }
        });

        console.log(`Created Test Run: ${run.id}`);

        // 1. First Run (Executing generators)
        console.log("\n--- Pass 1: Fresh Execution ---");

        // Discovery is global-ish but let's cache one result as representative
        const inlets = await discoverInlets();
        const topInlet = inlets[0];
        await PipelineManager.saveArtifact(run.id, 'INLET_CANDIDATE', topInlet);
        console.log("✅ Saved INLET_CANDIDATE");

        const spec = await PipelineManager.runStep(run.id, 'CAMPAIGN_SPEC', async () => {
            if (process.env.OPENAI_API_KEY) {
                console.log("   (Inner) Generating Campaign Spec...");
                return await generateCampaignSpec('EDUCATIONAL', topInlet);
            } else {
                console.warn("   (Inner) Missing API Key. Using mock spec.");
                return {
                    slug: topInlet.trendId.toLowerCase().replace(/ /g, '-'),
                    persona: topInlet.persona,
                    intent: topInlet.problem,
                    seedKeywords: topInlet.suggestedKeywords,
                    strategy: 'EDUCATIONAL' as const,
                    layoutType: 'EDUCATIONAL' as const,
                    benefits: ["Full Access", "No Wait"],
                    proofPoints: ["10 Yrs Exp"],
                    disclaimers: ["Not insurance"],
                    budgetDaily: 50,
                    targetCpa: 30,
                    geo: "US",
                    tone: "Professional"
                };
            }
        });
        console.log("✅ Campaign Spec Generated");

        const lpSpec = await PipelineManager.runStep(run.id, 'LANDING_PAGE_SPEC', async () => {
            if (process.env.OPENAI_API_KEY) {
                console.log("   (Inner) Generating LP Spec...");
                return await generateLandingPageSpec(campaign.id, spec);
            } else {
                console.warn("   (Inner) Missing API Key. Using mock LP spec.");
                return {
                    hero: { headline: "Hello", subheadline: "World", cta: "Click" },
                    benefits: ["Full Access"],
                    howItWorks: [{ title: "Step 1", desc: "Do it" }],
                    proof: ["Proof 1"],
                    pricing: { headline: "Pricing", subheadline: "Cheap", tiers: [] },
                    faqs: [],
                    ctaSection: { headline: "Bye", subheadline: "Bye", buttonText: "Bye" }
                };
            }
        });
        console.log("✅ Landing Page Spec Generated");

        // 2. Second Run (Should use cache)
        console.log("\n--- Pass 2: Re-run (Should be cached) ---");

        let generatorCalled = false;
        const cachedSpec = await PipelineManager.runStep(run.id, 'CAMPAIGN_SPEC', async () => {
            generatorCalled = true;
            return spec; // Should not be reached
        });

        if (generatorCalled) {
            console.error("❌ ERROR: Campaign Spec generator was called despite cache!");
        } else {
            console.log("✅ SUCCESS: Campaign Spec used CACHE");
        }

        generatorCalled = false;
        const cachedLPSpec = await PipelineManager.runStep(run.id, 'LANDING_PAGE_SPEC', async () => {
            generatorCalled = true;
            return lpSpec; // Should not be reached
        });

        if (generatorCalled) {
            console.error("❌ ERROR: LP Spec generator was called despite cache!");
        } else {
            console.log("✅ SUCCESS: LP Spec used CACHE");
        }

        // 3. Verification of Gating & Scoring
        console.log("\n--- Verification: Scoring & Gating ---");
        console.log("Inlet Choice Justification:", topInlet.justification);
        console.log("Score Breakdown:", JSON.stringify(topInlet.score, null, 2));

        // Cleanup
        await prisma.campaignRun.delete({ where: { id: run.id } });
        await prisma.campaign.delete({ where: { id: campaign.id } });
        console.log("\n✅ Test Complete (Cleanup done).");

    } catch (error) {
        console.error("💥 Reproducibility Test Failed:", error);
    }
}

testReproducibility();

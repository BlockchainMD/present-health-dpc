import { validateContent } from './compliance';

interface AdAssets {
    headlines: string[];
    descriptions: string[];
}

export function generateAdAssets(campaign: any): AdAssets {
    const headlines: string[] = [];
    const descriptions: string[] = [];

    // --- HEADLINES (Max 30 chars) ---
    // 1. Brand
    headlines.push("Present Health DPC");
    headlines.push("Direct Primary Care");
    headlines.push("Meet Dr. J");

    // 2. Intent/Persona (Truncated to 30 chars if needed)
    if (campaign.intent.length <= 30) headlines.push(campaign.intent);
    if (campaign.persona.length <= 30) headlines.push(`Care for ${campaign.persona}`);

    // 3. Benefits (From Campaign Spec)
    campaign.benefits.forEach((b: string) => {
        if (b.length <= 30) headlines.push(b);
    });

    // 4. Call to Action
    headlines.push("Book Free Intro Call");
    headlines.push("No Waiting Rooms");
    headlines.push("Text Your Doctor");

    // --- DESCRIPTIONS (Max 90 chars) ---
    // 1. Proof Points
    campaign.proofPoints.forEach((p: string) => {
        if (p.length <= 90) descriptions.push(p);
    });

    // 2. Combined Benefits
    const benefitDesc = campaign.benefits.slice(0, 2).join(". ");
    if (benefitDesc.length <= 90) descriptions.push(benefitDesc);

    // 3. Standard Value Prop
    descriptions.push("Experience healthcare the way it should be. Direct access, transparent pricing, no insurance hassles.");
    descriptions.push("Your personal doctor is just a text away. Join Present Health today.");

    // --- VALIDATION ---
    const safeHeadlines = headlines.filter(h => validateContent(h, "Headline").status === 'PASS');
    const safeDescriptions = descriptions.filter(d => validateContent(d, "Description").status === 'PASS');

    // Ensure minimums (Google Ads requires 3 headlines, 2 descriptions)
    // If we filtered too many, we might need fallbacks, but for now we return what we have.

    return {
        headlines: [...new Set(safeHeadlines)].slice(0, 15), // Max 15
        descriptions: [...new Set(safeDescriptions)].slice(0, 4) // Max 4
    };
}

export async function syncToGoogleAds(runId: string, dryRun: boolean = true) {
    // In Phase 1, this is strictly a DRY RUN / Placeholder.
    // We do NOT connect to the Google Ads API yet.

    console.log(`[GoogleAds] Syncing run ${runId} (DryRun: ${dryRun})`);

    if (dryRun) {
        return {
            status: 'success',
            mode: 'dry-run',
            message: 'Dry run successful. No changes applied to Google Ads.',
            mockResourceIds: {
                campaign: 'mock-campaign-id',
                adGroup: 'mock-adgroup-id',
                ads: ['mock-ad-id-1']
            }
        };
    }

    // Phase 2: Implement actual API call here
    throw new Error("Live Google Ads sync is not enabled in Phase 1.");
}

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

import { GoogleAdsApi, enums } from 'google-ads-api';
import { prisma } from '@/lib/prisma';

export async function syncToGoogleAds(runId: string, dryRun: boolean = true) {
    if (dryRun) {
        console.log(`[GoogleAds] Syncing run ${runId} (DryRun: ${dryRun})`);
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

    // 1. Initialize API Client
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !developerToken || !customerId || !refreshToken) {
        throw new Error("Missing Google Ads credentials. Please check environment variables.");
    }

    const client = new GoogleAdsApi({
        client_id: clientId,
        client_secret: clientSecret,
        developer_token: developerToken,
    });

    const customer = client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
    });

    // 2. Fetch Campaign Run Data
    const run = await prisma.campaignRun.findUnique({
        where: { id: runId },
        include: { campaign: true }
    });

    if (!run) throw new Error("Campaign Run not found");

    console.log(`[GoogleAds] Starting Sync for Campaign: ${run.campaign.slug}`);

    try {
        // 3. Create Shared Budget (Or Campaign Budget)
        // Note: Using micros (x1,000,000). $50 = 50,000,000
        const budgetAmount = Math.round((run.campaign.budgetDaily || 50) * 1_000_000);

        const budgetRes = await customer.campaignBudgets.create({
            amount_micros: budgetAmount,
            explicitly_shared: false,
            name: `Budget - ${run.campaign.slug} - ${Date.now()}` // Unique name
        });
        const budgetResourceName = budgetRes.resource_name;
        console.log(`[GoogleAds] Created Budget: ${budgetResourceName}`);

        // 4. Create Campaign (PAUSED)
        const campaignRes = await customer.campaigns.create({
            name: `${run.campaign.slug} [Search]`,
            campaign_budget: budgetResourceName,
            status: enums.CampaignStatus.PAUSED, // SAFETY: Always paused
            advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
            manual_cpc: {
                enhanced_cpc_enabled: true
            },
            // Target US by default if geo is US, otherwise we'd need to look up GeoTargetConstants. 
            // For now, we rely on account defaults or manual settings, but we can add geo later.
            network_settings: {
                target_google_search: true,
                target_search_network: true,
                target_partner_search_network: false,
                target_content_network: false
            }
        });
        const campaignResourceName = campaignRes.resource_name;
        console.log(`[GoogleAds] Created Campaign: ${campaignResourceName}`);

        // 5. Create Ad Group
        const adGroupRes = await customer.adGroups.create({
            campaign: campaignResourceName,
            name: `AdGroup - ${run.campaign.persona} - ${run.campaign.intent}`,
            status: enums.AdGroupStatus.ENABLED,
            type: enums.AdGroupType.SEARCH_STANDARD,
            cpc_bid_micros: 2_000_000, // $2.00 default bid
        });
        const adGroupResourceName = adGroupRes.resource_name;
        console.log(`[GoogleAds] Created AdGroup: ${adGroupResourceName}`);

        // 6. Create Keywords
        const keywordOps = run.chosenKeywords.map((kw, i) => {
            const matchType = run.matchTypes[i] === 'Exact' ? enums.KeywordMatchType.EXACT : enums.KeywordMatchType.PHRASE;
            return {
                ad_group: adGroupResourceName,
                text: kw,
                match_type: matchType,
                status: enums.AdGroupCriterionStatus.ENABLED
            };
        });

        // Batch create keywords
        // Note: Library might need iterative calls if array is large, but for <50 it's fine.
        for (const op of keywordOps) {
            await customer.adGroupCriteria.create(op);
        }
        console.log(`[GoogleAds] Created ${keywordOps.length} Keywords`);


        // 7. Create Responsive Search Ad (RSA)
        // Ensure we respect pinning limits or counts (Max 15 headlines, 4 descriptions)
        const headlines = run.rsaHeadlines.slice(0, 15).map(text => ({ text }));
        const descriptions = run.rsaDescriptions.slice(0, 4).map(text => ({ text }));

        // Construct Final URL
        const finalUrl = `https://presenthealthmd.com/lp/${run.campaign.landingSlug}`;

        const adRes = await customer.adGroupAds.create({
            ad_group: adGroupResourceName,
            status: enums.AdGroupAdStatus.ENABLED,
            ad: {
                final_urls: [finalUrl],
                responsive_search_ad: {
                    headlines,
                    descriptions
                }
            }
        });
        console.log(`[GoogleAds] Created Ad: ${adRes.resource_name}`);

        return {
            status: 'success',
            mode: 'live',
            resourceNames: {
                campaign: campaignResourceName,
                adGroup: adGroupResourceName,
                budget: budgetResourceName,
                ad: adRes.resource_name
            }
        };

    } catch (error: any) {
        console.error("[GoogleAds] Sync Failed:", JSON.stringify(error, null, 2));
        // Try to decode Google Ads error structure if possible
        if (error.errors) {
            throw new Error(`Google Ads API Error: ${error.errors.map((e: any) => e.message).join(', ')}`);
        }
        throw error;
    }
}

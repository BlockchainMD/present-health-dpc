/**
 * META ADS INTEGRATION (Facebook/Instagram)
 * 
 * This module provides functionality to create and manage ad campaigns
 * on Meta platforms (Facebook and Instagram) via the Marketing API.
 */

import * as bizSdk from 'facebook-nodejs-business-sdk';
import { prisma } from '@/lib/prisma';
import { updateCampaignRunSnapshot } from './metrics';

const {
    FacebookAdsApi,
    AdAccount,
    Campaign,
    AdSet,
    AdCreative,
    Ad,
    AdImage
} = bizSdk;

// Campaign objectives (Outcome-based, required as of API v18+)
const CAMPAIGN_OBJECTIVES = {
    LEADS: 'OUTCOME_LEADS',
    TRAFFIC: 'OUTCOME_TRAFFIC',
    AWARENESS: 'OUTCOME_AWARENESS',
    ENGAGEMENT: 'OUTCOME_ENGAGEMENT',
    SALES: 'OUTCOME_SALES'
} as const;

// Ad Set optimization goals
const OPTIMIZATION_GOALS = {
    LINK_CLICKS: 'LINK_CLICKS',
    LANDING_PAGE_VIEWS: 'LANDING_PAGE_VIEWS',
    LEAD_GENERATION: 'LEAD_GENERATION',
    IMPRESSIONS: 'IMPRESSIONS',
    REACH: 'REACH'
} as const;

/**
 * Sanitizes content by removing markdown citation patterns like "([Present Health][1])"
 * These are often included by ChatGPT when generating content with source references
 */
function sanitizeAdCopy(text: string): string {
    if (!text) return text;
    // Remove patterns like "([Present Health][1])" or "([text][number])"
    return text.replace(/\s*\(\[[^\]]+\]\[[^\]]+\]\)/g, '').trim();
}

/**
 * Uploads an image to Meta Ads Account using base64 bytes (more reliable than file upload)
 */
export async function uploadAdImage(imageUrl: string): Promise<string> {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const adAccountId = process.env.META_AD_ACCOUNT_ID;

    if (!accessToken || !adAccountId) {
        throw new Error("Missing Meta Ads credentials.");
    }

    try {
        // Download image and convert to base64
        console.log(`[MetaAds] Downloading remote image: ${imageUrl}`);
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to download image (${response.status})`);
        }
        const buffer = await response.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');
        console.log(`[MetaAds] Downloaded ${buffer.byteLength} bytes, uploading to Meta...`);

        // Use direct API call with bytes field (more reliable than SDK file upload)
        const uploadUrl = `https://graph.facebook.com/v24.0/${adAccountId}/adimages`;
        const uploadParams = new URLSearchParams({
            bytes: base64Image,
            access_token: accessToken
        });

        const uploadRes = await fetch(uploadUrl, { method: 'POST', body: uploadParams });
        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
            console.error('[MetaAds] Image Upload API Error:', JSON.stringify(uploadData, null, 2));
            throw new Error(uploadData.error?.message || 'Image upload failed');
        }

        // Extract hash from response
        const imageHash = Object.values(uploadData.images as Record<string, any>)[0]?.hash;
        if (!imageHash) {
            throw new Error('No image hash returned from upload');
        }

        console.log(`[MetaAds] Image uploaded successfully, hash: ${imageHash}`);
        return imageHash;

    } catch (error: any) {
        console.error("[MetaAds] Image Upload Failed:", error);
        throw error;
    }
}


/**
 * Maps persona/intent to Meta Interests (Mock/Simple version)
 */
function getInterestsForPersona(persona: string): number[] {
    const interests: Record<string, number> = {
        'Parenting': 6002839660071,
        'Healthcare': 6003273155709,
        'Wellness': 6003305530432,
        'Primary Care': 6003273155709, // Healthcare
        'Remote Work': 6008892120002,
        'Busy Professionals': 6002839660071, // Parenting/Career
    };

    const found = Object.entries(interests).find(([k]) =>
        persona.toLowerCase().includes(k.toLowerCase())
    );

    return found ? [found[1]] : [6003273155709]; // Default to Healthcare
}

/**
 * Syncs a CampaignRun to Meta Ads (Facebook/Instagram)
 * Creates: Campaign → Ad Set → Ad Creative → Ad
 */
export async function syncToMetaAds(runId: string, dryRun: boolean = true) {
    console.log(`[MetaAds] Syncing run ${runId} (DryRun: ${dryRun})`);

    // 1. Fetch Campaign Run Data
    const run = await prisma.campaignRun.findUnique({
        where: { id: runId },
        include: { campaign: true }
    });

    if (!run) throw new Error("Campaign Run not found");

    // 1b. Idempotency Check
    if (run.metaCampaignId && !dryRun) {
        console.log(`[MetaAds] Run ${runId} already has a Meta Campaign ID: ${run.metaCampaignId}. Skipping creation.`);
        return {
            status: 'success',
            mode: 'live',
            message: 'Campaign already exists.',
            resourceIds: {
                campaign: run.metaCampaignId,
                adSet: run.metaAdSetId,
                ad: (run.metaAdsResourceIds as any)?.ad
            }
        };
    }

    if (dryRun) {
        // Validate that we have all necessary data
        const validation = validateCampaignData(run);
        if (!validation.valid) {
            return {
                status: 'error',
                mode: 'dry-run',
                message: `Validation failed: ${validation.errors.join(', ')}`
            };
        }

        return {
            status: 'success',
            mode: 'dry-run',
            message: 'Dry run successful. No changes applied to Meta Ads.',
            resourceIds: {
                campaign: 'mock-campaign-id',
                adSet: 'mock-adset-id',
                ad: 'mock-ad-id'
            }
        };
    }

    // 2. Initialize API Client
    const accessToken = process.env.META_ACCESS_TOKEN;
    const adAccountId = process.env.META_AD_ACCOUNT_ID;

    if (!accessToken || !adAccountId) {
        throw new Error("Missing Meta Ads credentials. Please check META_ACCESS_TOKEN and META_AD_ACCOUNT_ID environment variables.");
    }

    // Initialize the API
    FacebookAdsApi.init(accessToken);
    const api = FacebookAdsApi.getDefaultApi();
    api.setDebug(process.env.NODE_ENV === 'development');

    const adAccount = new AdAccount(adAccountId);

    console.log(`[MetaAds] Starting Live Sync for Campaign: ${run.campaign.slug}`);

    try {
        // 3. Create Campaign (PAUSED for safety)
        const campaignParams = {
            name: `${run.campaign.slug} [Meta] - ${Date.now()}`,
            objective: 'OUTCOME_TRAFFIC', // Use explicit string for API compatibility
            status: 'PAUSED', // Use explicit string instead of SDK enum
            special_ad_categories: [] as string[], // Empty = no special category
            is_adset_budget_sharing_enabled: false, // Required by API when not using campaign budget
        };

        const campaignResult = await adAccount.createCampaign([], campaignParams);
        const campaignId = campaignResult.id;
        console.log(`[MetaAds] Created Campaign: ${campaignId}`);

        // 4. Create Ad Set with targeting
        const dailyBudgetCents = Math.round((run.campaign.budgetDaily || 50) * 100);
        const interests = getInterestsForPersona(run.campaign.persona);

        const adSetParams = {
            name: `AdSet - ${run.campaign.persona.slice(0, 50)}`,
            campaign_id: campaignId,
            daily_budget: dailyBudgetCents,
            billing_event: 'IMPRESSIONS', // Use explicit string
            optimization_goal: 'LINK_CLICKS', // Use explicit string
            bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
            status: 'PAUSED', // Use explicit string
            targeting: {
                geo_locations: {
                    countries: ['US']
                },
                age_min: 25,
                age_max: 65,
                interests: interests.map(id => ({ id: String(id) }))
            },
        };

        const adSetResult = await adAccount.createAdSet([], adSetParams);
        const adSetId = adSetResult.id;
        console.log(`[MetaAds] Created Ad Set: ${adSetId} with interests: ${interests}`);

        // 5. Create Ad Creative with Optional Image
        const adPlan = (run.artifacts as any)?.AD_PLAN?.data;
        let imageHash = (run.artifacts as any)?.metaImageHash;
        const imageUrl = adPlan?.imageUrl || (run.artifacts as any)?.imageUrl || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=1000";

        console.log(`[MetaAds] Image resolution: existingHash=${imageHash}, url=${imageUrl}`);

        // Try to upload image if a URL is present but hash is not
        if (!imageHash && imageUrl) {
            try {
                imageHash = await uploadAdImage(imageUrl);

                // Persist the image hash back to artifacts to avoid re-uploading
                const artifacts = (run.artifacts as any) || {};
                artifacts.metaImageHash = imageHash;
                await prisma.campaignRun.update({
                    where: { id: run.id },
                    data: { artifacts }
                });
                console.log(`[MetaAds] Persisted image hash: ${imageHash}`);
            } catch (e) {
                console.warn("[MetaAds] Failed to upload image, will retry or fallback.", e);
            }
        }

        // Final fallback if still no hash
        if (!imageHash) {
            console.warn("[MetaAds] No image hash or URL found. Using emergency placeholder hash.");
            imageHash = '9b6c89747397c08d8a158ee1b830e2b3'; // This will likely still fail if invalid, but it's our last resort
        }

        // Sanitize all ad copy to remove markdown citation patterns like "([Present Health][1])"
        const headline = sanitizeAdCopy(adPlan?.meta?.headline || run.rsaHeadlines[0]?.slice(0, 40) || 'Present Health DPC');
        const description = sanitizeAdCopy(adPlan?.meta?.description || run.rsaDescriptions[0]?.slice(0, 125) || 'Experience healthcare designed around you.');
        const primaryText = sanitizeAdCopy(adPlan?.meta?.primaryText || run.rsaDescriptions[1]?.slice(0, 125) || description);

        const finalUrl = run.finalUrl || `https://presenthealthmd.com/lp/${run.campaign.landingSlug}`;

        const creativeParams = {
            name: `Creative - ${run.campaign.slug}`,
            object_story_spec: {
                page_id: process.env.META_PAGE_ID,
                link_data: {
                    link: finalUrl,
                    message: primaryText,
                    name: headline,
                    description: description,
                    image_hash: imageHash,
                    call_to_action: {
                        type: 'LEARN_MORE',
                        value: {
                            link: finalUrl
                        }
                    }
                }
            }
            // Note: degrees_of_freedom_spec with standard_enhancements is deprecated as of API v24.0
        };


        const creativeResult = await adAccount.createAdCreative([], creativeParams);
        const creativeId = creativeResult.id;
        console.log(`[MetaAds] Created Ad Creative: ${creativeId}`);

        // 6. Create Ad
        const adParams = {
            name: `Ad - ${run.campaign.slug}`,
            adset_id: adSetId,
            creative: { creative_id: creativeId },
            status: 'PAUSED', // Use explicit string instead of SDK enum
        };

        const adResult = await adAccount.createAd([], adParams);
        const adId = adResult.id;
        console.log(`[MetaAds] Created Ad: ${adId}`);

        const resourceIds = {
            accountId: adAccountId,
            campaign: campaignId,
            adSet: adSetId,
            creative: creativeId,
            ad: adId
        };

        // 7. Persist Resource IDs to DB
        await prisma.campaignRun.update({
            where: { id: run.id },
            data: {
                metaCampaignId: campaignId,
                metaAdSetId: adSetId,
                metaAdsResourceIds: resourceIds,
                metaSyncStatus: 'OK',
            }
        });

        return {
            status: 'success',
            mode: 'live',
            resourceIds
        };

    } catch (error: any) {
        console.error("[MetaAds] Sync Failed:", error);

        // Log more detail if it's a Meta API error
        if (error.response?.error) {
            console.error("[MetaAds] API Error:", JSON.stringify(error.response.error, null, 2));
            throw new Error(`Meta Ads API Error: ${error.response.error.message}`);
        }

        throw error;
    }
}

/**
 * Validates campaign data before syncing
 */
function validateCampaignData(run: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!run.rsaHeadlines || run.rsaHeadlines.length === 0) {
        errors.push('Missing RSA headlines');
    }

    if (!run.rsaDescriptions || run.rsaDescriptions.length === 0) {
        errors.push('Missing RSA descriptions');
    }

    if (!run.campaign?.slug) {
        errors.push('Missing campaign slug');
    }

    if (!process.env.META_ACCESS_TOKEN) {
        errors.push('Missing META_ACCESS_TOKEN');
    }

    if (!process.env.META_AD_ACCOUNT_ID) {
        errors.push('Missing META_AD_ACCOUNT_ID');
    }

    if (!process.env.META_PAGE_ID) {
        errors.push('Missing META_PAGE_ID (Facebook Page ID required for ads)');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Fetches campaign metrics from Meta Ads
 */
export async function syncMetricsFromMetaAds(runId: string) {
    const run = await prisma.campaignRun.findUnique({
        where: { id: runId },
        include: { campaign: true }
    });

    if (!run || !run.metaCampaignId) {
        throw new Error("Run not found or not deployed to Meta Ads");
    }

    const accessToken = process.env.META_ACCESS_TOKEN;
    if (!accessToken) {
        throw new Error("Missing META_ACCESS_TOKEN");
    }

    FacebookAdsApi.init(accessToken);

    try {
        const campaign = new Campaign(run.metaCampaignId);

        // Fetch insights for the last 30 days
        const insights = await campaign.getInsights(
            ['impressions', 'clicks', 'spend', 'reach', 'cpc', 'ctr'],
            {
                time_increment: 1, // Get daily breakdown
                date_preset: 'last_30d',
                level: 'campaign'
            }
        );

        if (insights && insights.length > 0) {
            for (const data of insights) {
                const date = new Date(data.date_start);
                date.setHours(0, 0, 0, 0);

                await prisma.campaignMetric.upsert({
                    where: {
                        campaignRunId_date_platform: {
                            campaignRunId: run.id,
                            date: date,
                            platform: 'META_ADS'
                        }
                    },
                    update: {
                        impressions: parseInt(data.impressions || '0'),
                        clicks: parseInt(data.clicks || '0'),
                        cost: parseFloat(data.spend || '0'),
                        conversions: 0,
                    },
                    create: {
                        campaignRunId: run.id,
                        date: date,
                        platform: 'META_ADS',
                        impressions: parseInt(data.impressions || '0'),
                        clicks: parseInt(data.clicks || '0'),
                        cost: parseFloat(data.spend || '0'),
                        conversions: 0,
                    }
                });
            }

            // Also update the snapshot in CampaignRun
            await updateCampaignRunSnapshot(run.id);
        }

        return { success: true, insightsCount: insights.length };

    } catch (error: any) {
        console.error("[MetaAds] Metrics Sync Failed:", error);
        throw error;
    }
}

/**
 * Pauses a Meta campaign
 */
export async function pauseMetaCampaign(campaignId: string) {
    const accessToken = process.env.META_ACCESS_TOKEN;
    if (!accessToken) throw new Error("Missing META_ACCESS_TOKEN");

    FacebookAdsApi.init(accessToken);

    const campaign = new Campaign(campaignId);
    await campaign.update([], { status: Campaign.Status.paused });

    return { success: true };
}

/**
 * Activates a Meta campaign (use with caution - will spend money!)
 */
export async function activateMetaCampaign(campaignId: string) {
    const accessToken = process.env.META_ACCESS_TOKEN;
    if (!accessToken) throw new Error("Missing META_ACCESS_TOKEN");

    FacebookAdsApi.init(accessToken);

    const campaign = new Campaign(campaignId);
    await campaign.update([], { status: Campaign.Status.active });

    return { success: true };
}

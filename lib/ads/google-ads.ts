import { validateContent } from './compliance';
import { AdPlan, CampaignSpec } from './types';

interface AdAssets {
    headlines: string[];
    descriptions: string[];
}

export function generateAdPlan(campaign: CampaignSpec): AdPlan {
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

    // --- VALIDATION & FALLBACKS ---
    const safeHeadlines = headlines.filter(h => validateContent(h, "Headline").status === 'PASS');
    const safeDescriptions = descriptions.filter(d => validateContent(d, "Description").status === 'PASS');

    // Ensure minimums (Google Ads requires at least 3 headlines, 2 descriptions for RSA)
    const FALLBACK_HEADLINES = [
        "Present Health DPC",
        "Direct Primary Care",
        "Personalized Health Care",
        "Unrushed Doctor Visits"
    ];

    const FALLBACK_DESCRIPTIONS = [
        "Experience healthcare designed around you. Direct access to your personal physician.",
        "Simple, transparent monthly membership. No insurance hassles, no waiting rooms."
    ];

    while (safeHeadlines.length < 3 && FALLBACK_HEADLINES.length > 0) {
        const fallback = FALLBACK_HEADLINES.shift();
        if (fallback && !safeHeadlines.includes(fallback)) {
            safeHeadlines.push(fallback);
        }
    }

    while (safeDescriptions.length < 2 && FALLBACK_DESCRIPTIONS.length > 0) {
        const fallback = FALLBACK_DESCRIPTIONS.shift();
        if (fallback && !safeDescriptions.includes(fallback)) {
            safeDescriptions.push(fallback);
        }
    }

    return {
        campaignId: (campaign as any).id || "unknown", // Need to ensure ID is available
        rsa: {
            headlines: [...new Set(safeHeadlines)].slice(0, 15),
            descriptions: [...new Set(safeDescriptions)].slice(0, 4)
        },
        keywords: campaign.seedKeywords.map(kw => ({
            text: kw,
            matchType: 'PHRASE'
        })),
        negativeKeywords: GLOBAL_NEGATIVE_KEYWORDS,
        finalUrl: `https://presenthealthmd.com/lp/${campaign.slug}`
    };
}

import { GoogleAdsApi, enums } from 'google-ads-api';
import { prisma } from '@/lib/prisma';

const GLOBAL_NEGATIVE_KEYWORDS = [
    "job", "vacancy", "career", "salary", "hiring", "intership",
    "free", "cheap", "discount", "coupon",
    "amazon", "facebook", "google", "yelp",
    "science", "research", "study", "university", "college"
];

export async function syncToGoogleAds(runId: string, dryRun: boolean = true) {
    console.log(`[GoogleAds] Syncing run ${runId} (DryRun: ${dryRun})`);

    // 1. Fetch Campaign Run Data
    const run = await prisma.campaignRun.findUnique({
        where: { id: runId },
        include: { campaign: true }
    });

    if (!run) throw new Error("Campaign Run not found");

    if (dryRun) {
        return {
            status: 'success',
            mode: 'dry-run',
            message: 'Dry run successful. No changes applied to Google Ads.',
            resourceIds: {
                campaign: 'mock-campaign-id',
                adGroup: 'mock-adgroup-id',
                ads: ['mock-ad-id-1']
            }
        };
    }

    // 2. Initialize API Client
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
        customer_id: customerId.replace(/-/g, ''), // Ensure no dashes
        refresh_token: refreshToken,
    });

    console.log(`[GoogleAds] Starting Live Sync for Campaign: ${run.campaign.slug}`);

    try {
        // 3. Create Shared Budget
        const budgetAmount = Math.round((run.campaign.budgetDaily || 50) * 1_000_000);
        const budgetRes = await customer.campaignBudgets.create([{
            amount_micros: budgetAmount,
            explicitly_shared: false,
            name: `Budget - ${run.campaign.slug} - ${Date.now()}`
        }]);
        const budgetResourceName = budgetRes.results[0].resource_name;
        console.log(`[GoogleAds] Created Budget: ${budgetResourceName}`);

        // 4. Create Campaign (PAUSED)
        const campaignRes = await customer.campaigns.create([{
            name: `${run.campaign.slug} [Search] - ${Date.now()}`,
            campaign_budget: budgetResourceName,
            status: enums.CampaignStatus.PAUSED, // SAFETY: Always paused
            advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
            manual_cpc: {
                enhanced_cpc_enabled: true
            },
            network_settings: {
                target_google_search: true,
                target_search_network: true,
                target_partner_search_network: false,
                target_content_network: false
            }
        }]);
        const campaignResourceName = campaignRes.results[0].resource_name;
        console.log(`[GoogleAds] Created Campaign: ${campaignResourceName}`);

        // 5. Target United States (Criterion ID 2840)
        try {
            await customer.campaignCriteria.create([{
                campaign: campaignResourceName,
                location: {
                    geo_target_constant: "geoTargetConstants/2840", // USA
                },
                type: enums.CriterionType.LOCATION,
            }]);
            console.log(`[GoogleAds] Targeted United States`);
        } catch (geoError) {
            console.error("[GoogleAds] Failed to add geo-targeting:", geoError);
            // Non-blocking but good to know
        }

        // 6. Create Ad Group
        const adGroupRes = await customer.adGroups.create([{
            campaign: campaignResourceName,
            name: `AdGroup - ${run.campaign.persona.slice(0, 50)}`,
            status: enums.AdGroupStatus.ENABLED,
            type: enums.AdGroupType.SEARCH_STANDARD,
            cpc_bid_micros: 2_000_000, // $2.00 default bid
        }]);
        const adGroupResourceName = adGroupRes.results[0].resource_name;
        console.log(`[GoogleAds] Created AdGroup: ${adGroupResourceName}`);

        // 7. Create Keywords
        const keywordOps = run.chosenKeywords.map((kw, i) => {
            const matchType = run.matchTypes[i] === 'Exact' ? enums.KeywordMatchType.EXACT : enums.KeywordMatchType.PHRASE;
            return {
                ad_group: adGroupResourceName,
                criterion_type: enums.CriterionType.KEYWORD,
                keyword: {
                    text: kw,
                    match_type: matchType,
                },
                status: enums.AdGroupCriterionStatus.ENABLED
            };
        });

        // Batch create keywords if any
        if (keywordOps.length > 0) {
            await customer.adGroupCriteria.create(keywordOps);
            console.log(`[GoogleAds] Created ${keywordOps.length} Keywords`);
        }

        // 7b. Create Negative Keywords (Global Protection)
        const negativeOps = GLOBAL_NEGATIVE_KEYWORDS.map(text => ({
            ad_group: adGroupResourceName,
            criterion_type: enums.CriterionType.KEYWORD,
            keyword: {
                text: text,
                match_type: enums.KeywordMatchType.BROAD,
            },
            negative: true,
            status: enums.AdGroupCriterionStatus.ENABLED
        }));

        await customer.adGroupCriteria.create(negativeOps);
        console.log(`[GoogleAds] Created ${negativeOps.length} Negative Keywords`);

        // 8. Create Responsive Search Ad (RSA)
        const headlines = run.rsaHeadlines.slice(0, 15).map(text => ({ text: text.slice(0, 30) }));
        const descriptions = run.rsaDescriptions.slice(0, 4).map(text => ({ text: text.slice(0, 90) }));

        const finalUrl = run.finalUrl || `https://presenthealthmd.com/lp/${run.campaign.landingSlug}`;

        const adRes = await customer.adGroupAds.create([{
            ad_group: adGroupResourceName,
            status: enums.AdGroupAdStatus.ENABLED,
            ad: {
                final_urls: [finalUrl],
                responsive_search_ad: {
                    headlines,
                    descriptions
                }
            }
        }]);
        const adResourceName = adRes.results[0].resource_name;
        console.log(`[GoogleAds] Created Ad: ${adResourceName}`);

        const resourceIds = {
            campaign: campaignResourceName,
            adGroup: adGroupResourceName,
            budget: budgetResourceName,
            ad: adResourceName
        };

        // 9. Persist Resource IDs to DB
        await prisma.campaignRun.update({
            where: { id: run.id },
            data: {
                googleAdsResourceIds: resourceIds,
                status: 'DEPLOYED'
            }
        });

        return {
            status: 'success',
            mode: 'live',
            resourceIds
        };

    } catch (error: any) {
        console.error("[GoogleAds] Sync Failed:", error);

        // Log more detail if it's a Google Ads API error
        if (error.errors) {
            console.error("[GoogleAds] API Errors:", JSON.stringify(error.errors, null, 2));
            throw new Error(`Google Ads API Error: ${error.errors.map((e: any) => e.message).join(', ')}`);
        }

        throw error;
    }
}

export async function syncMetricsFromGoogleAds(runId: string) {
    const run = await prisma.campaignRun.findUnique({
        where: { id: runId },
        include: { campaign: true }
    });

    if (!run || !run.googleAdsResourceIds) {
        throw new Error("Run not found or not deployed to Google Ads");
    }

    const resourceIds = run.googleAdsResourceIds as any;
    const campaignResourceName = resourceIds.campaign;

    if (!campaignResourceName) throw new Error("Google Ads Campaign ID missing in run");

    // Initialize Client
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !developerToken || !customerId || !refreshToken) {
        throw new Error("Missing Google Ads credentials");
    }

    const client = new GoogleAdsApi({
        client_id: clientId,
        client_secret: clientSecret,
        developer_token: developerToken,
    });

    const customer = client.Customer({
        customer_id: customerId.replace(/-/g, ''),
        refresh_token: refreshToken,
    });

    try {
        // Query metrics using GAQL
        const query = `
            SELECT
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                segments.date
            FROM campaign
            WHERE campaign.resource_name = '${campaignResourceName}'
            AND segments.date DURING LAST_30_DAYS
            ORDER BY segments.date ASC
        `;

        const report = await customer.query(query);

        const dailyStats = report.map((row: any) => ({
            date: new Date(row.segments.date),
            impressions: row.metrics.impressions || 0,
            clicks: row.metrics.clicks || 0,
            conversions: row.metrics.conversions || 0,
            cost: (row.metrics.cost_micros || 0) / 1000000 // Convert micros to currency
        }));

        // Persist to CampaignMetric table
        if (dailyStats.length > 0) {
            await prisma.$transaction(
                dailyStats.map(data =>
                    prisma.campaignMetric.upsert({
                        where: {
                            campaignRunId_date: {
                                campaignRunId: run.id,
                                date: data.date
                            }
                        },
                        update: data,
                        create: {
                            ...data,
                            campaignRunId: run.id
                        }
                    })
                )
            );

            // Update the snapshot in CampaignRun
            const aggregate = dailyStats.reduce((acc, curr) => ({
                impressions: acc.impressions + curr.impressions,
                clicks: acc.clicks + curr.clicks,
                conversions: acc.conversions + curr.conversions,
                cost: acc.cost + curr.cost
            }), { impressions: 0, clicks: 0, conversions: 0, cost: 0 });

            const ctr = aggregate.impressions ? (aggregate.clicks / aggregate.impressions) : 0;
            const cvr = aggregate.clicks ? (aggregate.conversions / aggregate.clicks) : 0;
            const cpa = aggregate.conversions ? (aggregate.cost / aggregate.conversions) : 0;

            await prisma.campaignRun.update({
                where: { id: run.id },
                data: {
                    metrics: {
                        ...aggregate,
                        ctr,
                        cvr,
                        cpa
                    },
                    lastMetricsSync: new Date()
                }
            });
        }

        return { success: true, count: dailyStats.length };

    } catch (error: any) {
        console.error("[GoogleAds] Metrics Sync Failed:", error);
        throw error;
    }
}

/**
 * Uploads an offline click conversion to Google Ads.
 * This should be triggered when a lead is marked as BOOKED.
 */
export async function uploadConversionToGoogleAds(gclid: string, conversionDateTime?: Date) {
    if (!gclid) return;

    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !developerToken || !customerId || !refreshToken) {
        console.warn("[GoogleAds] Missing credentials for conversion upload");
        return;
    }

    const client = new GoogleAdsApi({
        client_id: clientId,
        client_secret: clientSecret,
        developer_token: developerToken,
    });

    const customer = client.Customer({
        customer_id: customerId.replace(/-/g, ''),
        refresh_token: refreshToken,
    });

    try {
        // 1. Get or find the Conversion Action for "Intro Call Booking"
        // For simplicity, we'll assume a specific resource name or search for it
        const conversionActionName = "Intro Call Booking";
        const query = `SELECT conversion_action.resource_name FROM conversion_action WHERE conversion_action.name = '${conversionActionName}'`;
        const result = await customer.query(query);

        let conversionActionResourceName: string | null | undefined;
        if (result && result.length > 0 && result[0].conversion_action) {
            conversionActionResourceName = result[0].conversion_action.resource_name;
        } else {
            // Create the conversion action if it doesn't exist
            const operation = {
                name: conversionActionName,
                type: enums.ConversionActionType.UPLOAD_CLICKS,
                status: enums.ConversionActionStatus.ENABLED,
                category: enums.ConversionActionCategory.BOOK_APPOINTMENT,
            };
            const response = await customer.conversionActions.create([operation]);
            conversionActionResourceName = response.results?.[0]?.resource_name;
            console.log(`[GoogleAds] Created new Conversion Action: ${conversionActionName}`);
        }

        // 2. Upload the Click Conversion
        const conversionTime = conversionDateTime || new Date();
        const formattedDate = conversionTime.toISOString().replace(/T/, ' ').replace(/\..+/, '') + ' +0000';

        if (!conversionActionResourceName) {
            throw new Error("Could not determine Conversion Action resource name");
        }

        const clickConversion = {
            conversion_action: conversionActionResourceName,
            gclid: gclid,
            conversion_date_time: formattedDate,
            conversion_value: 100.0, // Arbitrary value for optimization
            currency_code: 'USD',
        };

        await customer.conversionUploads.uploadClickConversions({
            customer_id: customerId.replace(/-/g, ''),
            conversions: [clickConversion],
            partial_failure: false,
            validate_only: false,
        } as any);
        console.log(`[GoogleAds] Successfully uploaded conversion for GCLID: ${gclid}`);

        return { success: true };
    } catch (error: any) {
        console.error("[GoogleAds] Conversion Upload Failed:", error.errors || error);
        // We don't throw here to avoid failing the webhook if Ads upload fails
        return { success: false, error: error.message };
    }
}

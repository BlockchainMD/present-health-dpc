#!/usr/bin/env node
require('dotenv').config();

const accessToken = process.env.META_ACCESS_TOKEN;
const adAccountId = process.env.META_AD_ACCOUNT_ID;

async function testCreateAdSet() {
    const url = `https://graph.facebook.com/v24.0/${adAccountId}/adsets`;

    // First create a campaign
    const campaignUrl = `https://graph.facebook.com/v24.0/${adAccountId}/campaigns`;
    const campaignParams = new URLSearchParams({
        name: `Test Campaign - ${Date.now()}`,
        objective: 'OUTCOME_TRAFFIC',
        status: 'PAUSED',
        special_ad_categories: JSON.stringify([]),
        is_adset_budget_sharing_enabled: 'false',
        access_token: accessToken
    });

    console.log('1. Creating test campaign...');
    const campaignRes = await fetch(campaignUrl, { method: 'POST', body: campaignParams });
    const campaignData = await campaignRes.json();

    if (!campaignRes.ok) {
        console.error('Campaign creation failed:', campaignData);
        return;
    }

    const campaignId = campaignData.id;
    console.log(`   Campaign created: ${campaignId}`);

    // Now test ad set
    console.log('\n2. Creating test ad set...');

    const adSetParams = new URLSearchParams({
        name: 'Test AdSet',
        campaign_id: campaignId,
        daily_budget: '5000',
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        status: 'PAUSED',
        targeting: JSON.stringify({
            geo_locations: { countries: ['US'] },
            age_min: 25,
            age_max: 65
        }),
        access_token: accessToken
    });

    console.log('AdSet Params:', Object.fromEntries(adSetParams));

    const response = await fetch(url, { method: 'POST', body: adSetParams });
    const data = await response.json();

    if (!response.ok) {
        console.error('\n❌ AdSet Error Response:');
        console.error(JSON.stringify(data, null, 2));
    } else {
        console.log('\n✅ AdSet Success:');
        console.log(JSON.stringify(data, null, 2));
    }
}

testCreateAdSet();

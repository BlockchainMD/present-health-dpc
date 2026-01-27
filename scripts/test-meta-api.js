require('dotenv').config();

const accessToken = process.env.META_ACCESS_TOKEN;
const adAccountId = process.env.META_AD_ACCOUNT_ID;

async function testCreateCampaign() {
    const url = `https://graph.facebook.com/v24.0/${adAccountId}/campaigns`;
    
    const params = new URLSearchParams({
        name: `Test Campaign - ${Date.now()}`,
        objective: 'OUTCOME_TRAFFIC',
        status: 'PAUSED',
        special_ad_categories: JSON.stringify([]),
        is_adset_budget_sharing_enabled: 'false',
        access_token: accessToken
    });

    console.log('Testing Meta Ads Campaign Creation with is_adset_budget_sharing_enabled...');

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: params
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error('\n❌ Error Response:');
            console.error(JSON.stringify(data, null, 2));
        } else {
            console.log('\n✅ Success! Campaign created:');
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error('Fetch Error:', err);
    }
}

testCreateCampaign();

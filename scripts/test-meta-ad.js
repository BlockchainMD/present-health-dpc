require('dotenv').config();
const accessToken = process.env.META_ACCESS_TOKEN;
const adAccountId = process.env.META_AD_ACCOUNT_ID;

async function testAdCreation() {
    console.log('Testing Ad Creation...\n');
    
    // Use existing ad set and creative IDs from the logs
    const adSetId = '120240144421120392';
    const creativeId = '1956122988271863';
    
    const url = `https://graph.facebook.com/v24.0/${adAccountId}/ads`;
    
    const params = new URLSearchParams({
        name: 'Test Ad - ' + Date.now(),
        adset_id: adSetId,
        creative: JSON.stringify({ creative_id: creativeId }),
        status: 'PAUSED',
        access_token: accessToken
    });

    console.log('Params:', Object.fromEntries(params));
    
    const res = await fetch(url, { method: 'POST', body: params });
    const data = await res.json();
    
    if (!res.ok) {
        console.error('\n❌ Ad Error:', JSON.stringify(data, null, 2));
    } else {
        console.log('\n✅ Ad Success:', JSON.stringify(data, null, 2));
    }
}

testAdCreation().catch(console.error);

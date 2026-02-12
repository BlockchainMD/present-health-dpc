require('dotenv').config();
const accessToken = process.env.META_ACCESS_TOKEN;
const adAccountId = process.env.META_AD_ACCOUNT_ID;
const pageId = process.env.META_PAGE_ID;

async function testCreativeCreation() {
    console.log('Testing Ad Creative Creation without deprecated fields...\n');
    const imageHash = 'b0575660a072b98821eef9f05d1cc4b2';
    const url = `https://graph.facebook.com/v24.0/${adAccountId}/adcreatives`;
    
    const creativeData = {
        name: 'Test Creative - ' + Date.now(),
        object_story_spec: {
            page_id: pageId,
            link_data: {
                link: 'https://presenthealthmd.com',
                message: 'Unlimited virtual visits + direct messaging. $49/mo.',
                name: 'Virtual Direct Primary Care',
                description: 'Get direct access to your physician.',
                image_hash: imageHash,
                call_to_action: { type: 'LEARN_MORE', value: { link: 'https://presenthealthmd.com' } }
            }
        }
    };
    
    const params = new URLSearchParams({
        name: creativeData.name,
        object_story_spec: JSON.stringify(creativeData.object_story_spec),
        access_token: accessToken
    });
    
    const res = await fetch(url, { method: 'POST', body: params });
    const data = await res.json();
    
    if (!res.ok) {
        console.error('❌ Creative Error:', JSON.stringify(data, null, 2));
    } else {
        console.log('✅ Creative Success:', JSON.stringify(data, null, 2));
    }
}

testCreativeCreation().catch(console.error);

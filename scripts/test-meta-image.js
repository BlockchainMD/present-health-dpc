#!/usr/bin/env node
/**
 * Test Meta Ads image upload and ad creative creation
 */
require('dotenv').config();

const accessToken = process.env.META_ACCESS_TOKEN;
const adAccountId = process.env.META_AD_ACCOUNT_ID;
const pageId = process.env.META_PAGE_ID;

async function testImageUpload() {
    console.log('Testing Meta Ads Image Upload...\n');

    // Download image first
    const imageUrl = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=1000';
    console.log('1. Downloading image from:', imageUrl);

    const imageRes = await fetch(imageUrl);
    const imageBuffer = await imageRes.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    console.log(`   Downloaded ${imageBuffer.byteLength} bytes`);

    // Try uploading via bytes field instead of filename
    console.log('\n2. Uploading to Meta Ads via bytes field...');

    const uploadUrl = `https://graph.facebook.com/v24.0/${adAccountId}/adimages`;
    const uploadParams = new URLSearchParams({
        bytes: base64Image,
        access_token: accessToken
    });

    const uploadRes = await fetch(uploadUrl, { method: 'POST', body: uploadParams });
    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
        console.error('❌ Upload Error:');
        console.error(JSON.stringify(uploadData, null, 2));
        return null;
    }

    console.log('✅ Upload Success:');
    console.log(JSON.stringify(uploadData, null, 2));

    // Get the hash key
    const imageHash = Object.values(uploadData.images)[0]?.hash;
    console.log(`   Image Hash: ${imageHash}`);

    return imageHash;
}

async function testCreativeCreation(imageHash) {
    console.log('\n3. Testing Ad Creative Creation...');

    const url = `https://graph.facebook.com/v24.0/${adAccountId}/adcreatives`;

    const creativeData = {
        name: 'Test Creative - ' + Date.now(),
        object_story_spec: {
            page_id: pageId,
            link_data: {
                link: 'https://presenthealthmd.com',
                message: 'Test ad message',
                image_hash: imageHash
            }
        }
    };

    const params = new URLSearchParams({
        ...creativeData,
        object_story_spec: JSON.stringify(creativeData.object_story_spec),
        access_token: accessToken
    });

    const res = await fetch(url, { method: 'POST', body: params });
    const data = await res.json();

    if (!res.ok) {
        console.error('❌ Creative Error:');
        console.error(JSON.stringify(data, null, 2));
        return;
    }

    console.log('✅ Creative Success:');
    console.log(JSON.stringify(data, null, 2));
}

async function main() {
    const imageHash = await testImageUpload();
    if (imageHash) {
        await testCreativeCreation(imageHash);
    }
}

main().catch(console.error);

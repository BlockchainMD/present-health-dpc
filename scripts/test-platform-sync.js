const fetch = require('node-fetch');
const dotenv = require('dotenv');

dotenv.config();

async function testPlatformSync(campaignId) {
    console.log(`--- Testing Selective Platform Sync for Campaign: ${campaignId} ---`);

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';

    // 1. Test Syncing only Google Ads
    console.log("\n1. Testing: ONLY Google Ads...");
    try {
        const res = await fetch(`${baseUrl}/api/admin/campaigns/${campaignId}/deploy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platforms: ['GOOGLE_ADS'] })
        });
        const data = await res.json();

        if (data.googleSyncResult && !data.metaSyncResult) {
            console.log("✅ Success: Only Google Ads synced.");
        } else {
            console.log("❌ Failure: Expected only Google Ads results.");
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Test failed:", e.message);
    }

    // 2. Test Syncing only Meta Ads
    console.log("\n2. Testing: ONLY Meta Ads...");
    try {
        const res = await fetch(`${baseUrl}/api/admin/campaigns/${campaignId}/deploy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platforms: ['META_ADS'] })
        });
        const data = await res.json();

        if (data.metaSyncResult && !data.googleSyncResult) {
            console.log("✅ Success: Only Meta Ads synced.");
        } else {
            console.log("❌ Failure: Expected only Meta Ads results.");
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Test failed:", e.message);
    }
}

// Note: Run this with a valid campaign ID
// node scripts/test-platform-sync.js <campaign_id>
if (process.argv[2]) {
    testPlatformSync(process.argv[2]);
} else {
    console.log("Please provide a Campaign ID: node scripts/test-platform-sync.js <campaign_id>");
}

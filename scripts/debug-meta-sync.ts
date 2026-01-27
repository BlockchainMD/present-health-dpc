import { syncToMetaAds } from '../lib/ads/meta-ads';
// Use process.env for credentials as the SDK expects them

async function debug() {
    const runId = '5d9e2174-7cfb-479b-974c-129dce706d82';
    console.log(`Debugging Meta Sync for Run: ${runId}`);

    try {
        const result = await syncToMetaAds(runId, false);
        console.log('Sync Result:', JSON.stringify(result, null, 2));
    } catch (error: any) {
        console.error('Sync ERROR:');
        if (error.response?.error) {
            console.error(JSON.stringify(error.response.error, null, 2));
        } else {
            console.error(error);
        }
    }
}

debug();

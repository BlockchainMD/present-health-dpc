const bizSdk = require('facebook-nodejs-business-sdk');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

const { FacebookAdsApi, AdAccount } = bizSdk;

async function testConnection() {
    console.log("--- Meta Ads API Connectivity Test ---");

    const accessToken = process.env.META_ACCESS_TOKEN;
    const adAccountId = process.env.META_AD_ACCOUNT_ID;
    const pageId = process.env.META_PAGE_ID;

    if (!accessToken || !adAccountId) {
        console.error("❌ Missing required environment variables.");
        console.log({
            accessToken: !!accessToken,
            adAccountId: !!adAccountId,
            pageId: !!pageId
        });
        console.log("\nTo get started:");
        console.log("1. Go to https://developers.facebook.com/apps/");
        console.log("2. Create or select your app");
        console.log("3. Get your Access Token from the Marketing API section");
        console.log("4. Your Ad Account ID looks like 'act_123456789'");
        console.log("5. Your Page ID is the numeric ID of your Facebook Page");
        process.exit(1);
    }

    console.log(`Connecting to Ad Account: ${adAccountId}`);

    try {
        // Initialize the API
        FacebookAdsApi.init(accessToken);

        const adAccount = new AdAccount(adAccountId);

        // Fetch account info to validate connection
        console.log("Fetching account information...");
        const accountInfo = await adAccount.get(['name', 'account_status', 'currency', 'timezone_name']);

        console.log("✅ Success! API Connection established.");
        console.log("Ad Account Information:");
        console.log(`- ID: ${adAccountId}`);
        console.log(`- Name: ${accountInfo.name || 'N/A'}`);
        console.log(`- Status: ${accountInfo.account_status === 1 ? 'Active' : 'Inactive'}`);
        console.log(`- Currency: ${accountInfo.currency || 'N/A'}`);
        console.log(`- Timezone: ${accountInfo.timezone_name || 'N/A'}`);

        if (pageId) {
            console.log(`- Page ID configured: ${pageId}`);
        } else {
            console.warn("⚠️ META_PAGE_ID not set - required for creating ads");
        }

    } catch (error) {
        console.error("❌ API Connection Failed:");
        if (error.response && error.response.error) {
            console.error(JSON.stringify(error.response.error, null, 2));

            const errorCode = error.response.error.code;
            if (errorCode === 190) {
                console.log("\n💡 Your access token may be expired or invalid.");
                console.log("   Go to Graph API Explorer to get a new token.");
            } else if (errorCode === 100) {
                console.log("\n💡 Check that your Ad Account ID is correct.");
                console.log("   Format should be: act_123456789");
            }
        } else {
            console.error(error);
        }
    }
}

testConnection();

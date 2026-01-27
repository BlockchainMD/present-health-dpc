const { GoogleAdsApi } = require('google-ads-api');
const dotenv = require('dotenv');

dotenv.config();

async function listCustomers() {
    const client = new GoogleAdsApi({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });

    try {
        console.log('Fetching accessible customers...');
        const customers = await client.listAccessibleCustomers(process.env.GOOGLE_ADS_REFRESH_TOKEN);
        console.log('✅ Accessible Customers:', JSON.stringify(customers, null, 2));
    } catch (error) {
        console.error('❌ Failed to list customers!');
        console.error(error);
    }
}

listCustomers();

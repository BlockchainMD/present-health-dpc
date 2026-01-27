const { GoogleAdsApi, enums } = require('google-ads-api');
const dotenv = require('dotenv');

dotenv.config();

async function verifyToken() {
    const client = new GoogleAdsApi({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });

    const customer = client.Customer({
        customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID.replace(/-/g, ''),
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    try {
        console.log('Attempting to fetch campaign counts as verification...');
        const results = await customer.query(`
      SELECT campaign.id 
      FROM campaign 
      LIMIT 1
    `);
        console.log('✅ Verification successful! Successfully queried Google Ads API.');
        console.log('Query result:', JSON.stringify(results, null, 2));
    } catch (error) {
        console.error('❌ Verification failed!');
        console.error(error);
        process.exit(1);
    }
}

verifyToken();

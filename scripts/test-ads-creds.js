const dotenv = require('dotenv');
dotenv.config();

const REQUIRED_ENV_VARS = [
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET',
    'GOOGLE_ADS_CUSTOMER_ID',
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_REFRESH_TOKEN',
];

async function testCredentials() {
    const missing = REQUIRED_ENV_VARS.filter(
        (name) => !process.env[name] || !process.env[name].trim(),
    );

    if (missing.length > 0) {
        console.error(`Missing required environment variables: ${missing.join(', ')}`);
        process.exitCode = 1;
        return;
    }

    // Validate configuration before loading the provider client or making requests.
    const { GoogleAdsApi } = require('google-ads-api');
    const client = new GoogleAdsApi({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID.trim(),
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET.trim(),
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN.trim(),
    });

    const customer = client.Customer({
        customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID.trim().replace(/-/g, ''),
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN.trim(),
    });

    console.log('Testing Google Ads Credentials...');
    await customer.query(`
        SELECT customer.id, customer.descriptive_name
        FROM customer
        LIMIT 1
    `);
    console.log('Connection successful.');
}

testCredentials().catch(() => {
    // Provider errors can include request details; keep credentials out of logs.
    console.error('Connection failed. Check the Google Ads configuration and account permissions.');
    process.exitCode = 1;
});

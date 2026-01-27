const { GoogleAdsApi } = require('google-ads-api');
const dotenv = require('dotenv');
dotenv.config();

async function testCredentials() {
    console.log('Testing Google Ads Credentials...');
    console.log('Client ID:', process.env.GOOGLE_ADS_CLIENT_ID ? 'Set' : 'MISSING');
    console.log('Customer ID:', process.env.GOOGLE_ADS_CUSTOMER_ID);
    console.log('Developer Token:', process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? 'Set' : 'MISSING');

    const client = new GoogleAdsApi({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
        developer_token: '0l8PbISJSdL6N_vKJN9gVg', // Corrected token with 'l'
    });

    const customer = client.Customer({
        customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID.replace(/-/g, ''),
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    try {
        // Simple query to test connectivity
        const result = await customer.query(`
            SELECT customer.id, customer.descriptive_name 
            FROM customer 
            LIMIT 1
        `);
        console.log('✅ Connection Successful!');
        console.log('Customer Data:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ Connection Failed!');
        console.error('Error Message:', error.message);
        if (error.errors) {
            console.error('Detailed Errors:', JSON.stringify(error.errors, null, 2));
        }
    }
}

testCredentials();

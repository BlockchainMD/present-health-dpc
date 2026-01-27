const { GoogleAdsApi } = require('google-ads-api');
const dotenv = require('dotenv');

dotenv.config();

async function checkAccount(customerId) {
    const client = new GoogleAdsApi({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });

    const customer = client.Customer({
        customer_id: customerId.replace(/-/g, ''),
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    try {
        console.log(`Checking account: ${customerId}...`);
        const results = await customer.query(`
      SELECT customer.id, customer.descriptive_name, customer.test_account
      FROM customer
      LIMIT 1
    `);
        console.log('✅ Success!');
        console.log('Account Info:', JSON.stringify(results, null, 2));
        return true;
    } catch (error) {
        console.error(`❌ Failed for ${customerId}:`);
        console.error(error.message);
        if (error.errors) {
            console.error(JSON.stringify(error.errors, null, 2));
        }
        return false;
    }
}

async function main() {
    await checkAccount('9458437449');
    console.log('---');
    await checkAccount('3466628621');
}

main();

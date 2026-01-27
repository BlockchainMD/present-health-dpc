const { GoogleAdsApi } = require('google-ads-api');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

async function testConnection() {
    console.log("--- Google Ads API Connectivity Test ---");

    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !developerToken || !customerId || !refreshToken) {
        console.error("❌ Missing required environment variables.");
        console.log({
            clientId: !!clientId,
            clientSecret: !!clientSecret,
            developerToken: !!developerToken,
            customerId: !!customerId,
            refreshToken: !!refreshToken
        });
        process.exit(1);
    }

    console.log(`Connecting to Customer ID: ${customerId}`);

    try {
        const client = new GoogleAdsApi({
            client_id: clientId,
            client_secret: clientSecret,
            developer_token: developerToken,
        });

        const customer = client.Customer({
            customer_id: customerId.replace(/-/g, ''), // Ensure no dashes
            refresh_token: refreshToken,
        });

        // Basic query to fetch customer information
        console.log("Executing test query (GAQL)...");
        const results = await customer.query(`
            SELECT
                customer.id,
                customer.descriptive_name,
                customer.currency_code,
                customer.time_zone
            FROM customer
            LIMIT 1
        `);

        if (results && results.length > 0) {
            const info = results[0].customer;
            console.log("✅ Success! API Connection established.");
            console.log("Customer Information:");
            console.log(`- ID: ${info.id}`);
            console.log(`- Name: ${info.descriptive_name}`);
            console.log(`- Currency: ${info.currency_code}`);
            console.log(`- Time Zone: ${info.time_zone}`);
        } else {
            console.warn("⚠️ Query returned no results, but no error was thrown.");
        }

    } catch (error) {
        console.error("❌ API Connection Failed:");
        if (error.errors) {
            console.error(JSON.stringify(error.errors, null, 2));
        } else {
            console.error(error);
        }

        if (error.message && error.message.includes("DEVELOPER_TOKEN_NOT_APPROVED")) {
            console.log("\n💡 Potential Issue: Your Developer Token might still be in 'Test' mode or pending approval for basic access.");
        }
    }
}

testConnection();

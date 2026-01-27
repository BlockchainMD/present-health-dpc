const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

async function extendToken() {
    console.log("--- Meta Ads Token Extension ---");

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const shortToken = process.env.META_ACCESS_TOKEN;

    if (!appId || !appSecret || !shortToken) {
        console.error("❌ Missing required environment variables for token extension.");
        process.exit(1);
    }

    try {
        console.log("Requesting long-lived access token from Meta...");
        const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: appId,
                client_secret: appSecret,
                fb_exchange_token: shortToken
            }
        });

        const longToken = response.data.access_token;
        const expiresIn = response.data.expires_in; // Usually ~60 days

        console.log("✅ Successfully received long-lived token!");
        console.log(`Token expires in approximately ${Math.round(expiresIn / 86400)} days.`);

        // Update .env file
        const envPath = path.join(process.cwd(), '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');

        const regex = new RegExp(`META_ACCESS_TOKEN=${shortToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
        envContent = envContent.replace(regex, `META_ACCESS_TOKEN=${longToken}`);

        fs.writeFileSync(envPath, envContent);
        console.log("✅ Updated .env with long-lived access token.");

    } catch (error) {
        console.error("❌ Token Extension Failed:");
        if (error.response && error.response.data) {
            console.error(JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

extendToken();

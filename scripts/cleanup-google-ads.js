const { GoogleAdsApi, enums } = require('google-ads-api');
const dotenv = require('dotenv');

dotenv.config();

async function cleanup() {
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    if (!customerId) {
        console.error('GOOGLE_ADS_CUSTOMER_ID is not set in .env');
        process.exit(1);
    }

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
        console.log(`🚀 Starting cleanup for customer: ${customerId}...`);

        // 1. Fetch all campaigns
        console.log('Fetching campaigns...');
        const campaigns = await customer.query(`
      SELECT campaign.resource_name, campaign.name 
      FROM campaign 
      WHERE campaign.status != 'REMOVED'
    `);

        if (campaigns.length === 0) {
            console.log('✅ No active campaigns found.');
        } else {
            console.log(`Found ${campaigns.length} campaigns. Deleting...`);

            const operations = campaigns.map(c => ({
                resource_name: c.campaign.resource_name,
            }));

            // Delete in batches or all at once if small
            await customer.campaigns.remove(operations);

            campaigns.forEach(c => console.log(`  - Removed: ${c.campaign.name}`));
            console.log(`✅ Successfully removed ${campaigns.length} campaigns.`);
        }

        // 2. Fetch all shared budgets (optional but good for cleanup)
        console.log('\nFetching shared budgets...');
        const budgets = await customer.query(`
        SELECT campaign_budget.resource_name, campaign_budget.name
        FROM campaign_budget
        WHERE campaign_budget.status != 'REMOVED'
        AND campaign_budget.explicitly_shared = false
    `);

        if (budgets.length > 0) {
            console.log(`Found ${budgets.length} budgets. Deleting...`);
            const budgetOps = budgets.map(b => ({
                resource_name: b.campaign_budget.resource_name,
            }));
            await customer.campaignBudgets.remove(budgetOps);
            console.log(`✅ Successfully removed ${budgets.length} budgets.`);
        }

        console.log('\n✨ Cleanup complete! Your account is ready for a fresh start.');

    } catch (error) {
        console.error('❌ Cleanup failed!');
        if (error.errors) {
            console.error(JSON.stringify(error.errors, null, 2));
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

cleanup();

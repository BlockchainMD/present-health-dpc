const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const run = await prisma.campaignRun.findFirst({
        where: {
            status: 'DEPLOYED',
            googleCampaignId: { not: null },
            googleCustomerId: { not: null }
        },
        include: {
            campaign: true
        }
    });

    if (run) {
        console.log('Found deployed campaign:');
        console.log(`Campaign ID: ${run.campaignId}`);
        console.log(`Google Campaign ID: ${run.googleCampaignId}`);
        console.log(`Google Customer ID: ${run.googleCustomerId}`);
        console.log(`Campaign Name: ${run.campaign.name}`);
    } else {
        console.log('No deployed campaigns found with Google Ads IDs.');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

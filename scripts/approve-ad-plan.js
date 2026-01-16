const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    // Find all AD_PLAN assets that aren't approved
    const pendingAssets = await prisma.generatedAsset.findMany({
        where: {
            type: 'AD_PLAN',
            status: { not: 'APPROVED' }
        }
    });

    console.log(`Found ${pendingAssets.length} pending Ad Plans:\n`);

    for (const asset of pendingAssets) {
        console.log(`Asset ID: ${asset.id}`);
        console.log(`  Campaign ID: ${asset.campaignId}`);
        console.log(`  Status: ${asset.status}`);
        console.log('  Approving...');

        await prisma.generatedAsset.update({
            where: { id: asset.id },
            data: {
                status: 'APPROVED',
                approvedAt: new Date()
            }
        });

        console.log('  ✅ Approved!\n');
    }

    if (pendingAssets.length === 0) {
        console.log('No pending Ad Plans found. Checking all assets...');
        const allAssets = await prisma.generatedAsset.findMany({
            where: { type: 'AD_PLAN' }
        });

        for (const asset of allAssets) {
            console.log(`Asset: ${asset.id}, Status: ${asset.status}`);
        }

        if (allAssets.length === 0) {
            console.log('No AD_PLAN assets exist. The campaign may need to Auto-Generate first.');
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

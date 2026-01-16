const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    // Find the campaign
    const campaign = await prisma.campaign.findFirst({
        where: { slug: 'telecommuting-parents-healthcare' },
        include: {
            runs: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        }
    });

    if (!campaign) {
        console.log('Campaign not found!');
        return;
    }

    console.log(`Found campaign: ${campaign.slug}`);
    console.log(`Campaign ID: ${campaign.id}`);

    const latestRun = campaign.runs[0];
    if (!latestRun) {
        console.log('No campaign run found!');
        return;
    }

    console.log(`Latest Run ID: ${latestRun.id}`);
    console.log(`RSA Headlines: ${latestRun.rsaHeadlines?.length || 0}`);
    console.log(`RSA Descriptions: ${latestRun.rsaDescriptions?.length || 0}`);
    console.log(`Keywords: ${latestRun.chosenKeywords?.length || 0}`);

    // Check if AD_PLAN asset exists
    const existingAsset = await prisma.generatedAsset.findFirst({
        where: {
            campaignRunId: latestRun.id,
            type: 'AD_PLAN'
        }
    });

    if (existingAsset) {
        console.log(`\nAD_PLAN asset exists: ${existingAsset.id}`);
        console.log(`Status: ${existingAsset.status}`);

        if (existingAsset.status !== 'APPROVED') {
            console.log('Approving...');
            await prisma.generatedAsset.update({
                where: { id: existingAsset.id },
                data: {
                    status: 'APPROVED',
                    approvedAt: new Date()
                }
            });
            console.log('✅ Approved!');
        } else {
            console.log('Already approved!');
        }
    } else {
        console.log('\nNo AD_PLAN asset found. Creating one from existing run data...');

        // Create the AD_PLAN asset from existing data
        const adPlan = {
            rsa: {
                headlines: latestRun.rsaHeadlines || [],
                descriptions: latestRun.rsaDescriptions || []
            },
            keywords: (latestRun.chosenKeywords || []).map((kw, i) => ({
                text: kw,
                matchType: latestRun.matchTypes?.[i] || 'PHRASE'
            }))
        };

        const newAsset = await prisma.generatedAsset.create({
            data: {
                type: 'AD_PLAN',
                status: 'APPROVED',
                campaignId: campaign.id,
                campaignRunId: latestRun.id,
                promptVersion: 'v1-manual',
                input: { campaign: campaign.slug },
                output: adPlan,
                approvedAt: new Date()
            }
        });

        console.log(`✅ Created and approved AD_PLAN asset: ${newAsset.id}`);
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

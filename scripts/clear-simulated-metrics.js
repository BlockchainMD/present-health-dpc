const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearMetrics() {
    // Find the campaign by slug
    const campaign = await prisma.campaign.findFirst({
        where: { slug: 'present-health-virtual-dpc-hsa-149' },
        include: { runs: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });

    if (!campaign || !campaign.runs[0]) {
        console.log('Campaign not found');
        return;
    }

    const runId = campaign.runs[0].id;
    console.log(`Clearing metrics for run: ${runId}`);

    const result = await prisma.campaignMetric.deleteMany({
        where: { campaignRunId: runId }
    });

    console.log(`Deleted ${result.count} simulated metric records`);
    
    // Also reset any aggregated metrics on the run
    await prisma.campaignRun.update({
        where: { id: runId },
        data: { metrics: null }
    });
    console.log('Reset aggregated metrics on run');
}

clearMetrics()
    .then(() => prisma.$disconnect())
    .catch(e => { console.error(e); prisma.$disconnect(); });

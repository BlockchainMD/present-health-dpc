import { prisma } from '@/lib/prisma';
import { CampaignMetric } from '@prisma/client';

export interface DailyMetricStats {
    date: Date;
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
}

export async function generateMockMetrics(campaignRunId: string, days: number = 30) {
    const metrics: any[] = [];
    const now = new Date();

    for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        // Random mock data
        const impressions = Math.floor(Math.random() * 1000) + 100;
        const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.01)); // 1-6% CTR
        const conversions = Math.floor(clicks * (Math.random() * 0.1)); // 0-10% CVR
        const cpc = Math.random() * 2 + 0.5; // $0.50 - $2.50 CPC
        const cost = parseFloat((clicks * cpc).toFixed(2));

        metrics.push({
            campaignRunId,
            date,
            impressions,
            clicks,
            conversions,
            cost
        });
    }

    // Bulk create
    // Prisma createMany is not supported on all DBs (SQLite) but Postgres is fine.
    // Loop for safety if engine is mixed, or use createMany if confident.
    // Using transaction for atomic consistency.
    await prisma.$transaction(
        metrics.map(data =>
            prisma.campaignMetric.upsert({
                where: {
                    campaignRunId_date: {
                        campaignRunId: data.campaignRunId,
                        date: data.date
                    }
                },
                update: data,
                create: data
            })
        )
    );

    // Update the snapshot in CampaignRun
    await updateCampaignRunSnapshot(campaignRunId);
}

export async function updateCampaignRunSnapshot(campaignRunId: string) {
    // Aggregate totals
    const result = await prisma.campaignMetric.aggregate({
        where: { campaignRunId },
        _sum: {
            impressions: true,
            clicks: true,
            conversions: true,
            cost: true,
        }
    });

    const sums = result._sum;
    const clicks = sums.clicks || 0;
    const cost = sums.cost || 0;
    const conversions = sums.conversions || 0;

    const ctr = sums.impressions ? (clicks / sums.impressions) : 0;
    const cvr = clicks ? (conversions / clicks) : 0;
    const cpa = conversions ? (cost / conversions) : 0;

    await prisma.campaignRun.update({
        where: { id: campaignRunId },
        data: {
            metrics: {
                impressions: sums.impressions || 0,
                clicks,
                cost,
                conversions,
                ctr,
                cvr,
                cpa
            },
            lastMetricsSync: new Date()
        }
    });
}

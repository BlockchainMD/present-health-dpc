import { GoogleAdsApi, enums } from 'google-ads-api';
import { prisma } from '@/lib/prisma';

/**
 * Main metric sync job. 
 * Uses GoogleAdsSyncCursor to track progress and avoids duplicate fetches.
 */
export async function syncAllGoogleAdsMetrics() {
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    if (!customerId) throw new Error("GOOGLE_ADS_CUSTOMER_ID not found");

    const formattedCustomerId = customerId.replace(/-/g, '');

    // 1. Get or create cursor
    let cursor = await prisma.googleAdsSyncCursor.findUnique({
        where: { accountId: formattedCustomerId }
    });

    if (!cursor) {
        cursor = await prisma.googleAdsSyncCursor.create({
            data: {
                accountId: formattedCustomerId,
                status: 'OK'
            }
        });
    }

    // 2. Determine date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    // If we have a lastSyncedDate, start from there + 1 day
    let startDate = cursor.lastSyncedDate
        ? new Date(cursor.lastSyncedDate)
        : new Date(today);

    if (!cursor.lastSyncedDate) {
        startDate.setDate(today.getDate() - 30); // Default to last 30 days if no cursor
    } else {
        startDate.setDate(startDate.getDate() + 1);
    }

    if (startDate > yesterday) {
        console.log("[Sync] Already up to date.");
        return { status: 'skipped', message: 'Already up to date' };
    }

    // Formatting dates for GAQL: YYYY-MM-DD
    const formatGAQLDate = (d: Date) => d.toISOString().split('T')[0];
    const startDateStr = formatGAQLDate(startDate);
    const endDateStr = formatGAQLDate(yesterday);

    console.log(`[Sync] Syncing from ${startDateStr} to ${endDateStr}`);

    // 3. Initialize Client
    const client = new GoogleAdsApi({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    });

    const customer = client.Customer({
        customer_id: formattedCustomerId,
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    });

    try {
        // 4. Query metrics for ALL active campaigns in this account
        const query = `
      SELECT
        campaign.resource_name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        segments.date
      FROM campaign
      WHERE segments.date >= '${startDateStr}' AND segments.date <= '${endDateStr}'
      ORDER BY segments.date ASC
    `;

        const report = await customer.query(query);

        // 5. Upsert results into CampaignMetric
        for (const row of report) {
            // Skip rows with missing required data
            if (!row.campaign?.resource_name || !row.segments?.date) {
                console.warn('[Sync] Skipping row with missing campaign or segment data');
                continue;
            }

            const resourceName = row.campaign.resource_name;
            const date = new Date(row.segments.date);
            date.setHours(0, 0, 0, 0);

            // Find the CampaignRun matching this resource name
            const run = await prisma.campaignRun.findFirst({
                where: { googleResourceName: resourceName }
            });

            if (!run) {
                console.warn(`[Sync] No internal CampaignRun found for resource: ${resourceName}`);
                continue;
            }

            // Safely extract metrics with defaults
            const metrics = row.metrics ?? {};
            const impressions = metrics.impressions ?? 0;
            const clicks = metrics.clicks ?? 0;
            const conversions = metrics.conversions ?? 0;
            const cost = ((metrics.cost_micros ?? 0) as number) / 1000000;

            await prisma.campaignMetric.upsert({
                where: {
                    campaignRunId_date: {
                        campaignRunId: run.id,
                        date: date
                    }
                },
                update: {
                    impressions,
                    clicks,
                    conversions,
                    cost
                },
                create: {
                    campaignRunId: run.id,
                    date: date,
                    impressions,
                    clicks,
                    conversions,
                    cost
                }
            });
        }

        // 6. Update Cursor
        await prisma.googleAdsSyncCursor.update({
            where: { accountId: formattedCustomerId },
            data: {
                lastSuccessfulSyncAt: new Date(),
                lastSyncedDate: yesterday,
                status: 'OK',
                error: null
            }
        });

        console.log("[Sync] Successfully completed sync.");
        return { status: 'success', syncedUntil: endDateStr };

    } catch (err: any) {
        console.error("[Sync] Failed:", err);
        await prisma.googleAdsSyncCursor.update({
            where: { accountId: formattedCustomerId },
            data: {
                status: 'ERROR',
                error: err.message || JSON.stringify(err)
            }
        });
        throw err;
    }
}

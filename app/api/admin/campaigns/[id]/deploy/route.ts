import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncToGoogleAds } from '@/lib/ads/google-ads';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        // 1. Fetch Campaign and Latest Run
        const campaign = await prisma.campaign.findUnique({
            where: { id },
            include: {
                runs: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        const latestRun = campaign.runs[0];
        if (!latestRun) {
            return NextResponse.json({ error: 'No assets generated yet. Please generate assets first.' }, { status: 400 });
        }

        // 2. Sync to Google Ads (Live Mode: dryRun = false)
        console.log(`[Deploy] Deploying campaign ${campaign.slug} (Run: ${latestRun.id})`);
        const syncResult = await syncToGoogleAds(latestRun.id, false); // dryRun = false

        // 3. Update Status
        await prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: 'ACTIVE' }
        });

        // The status is already updated inside syncToGoogleAds for the run, 
        // but we can ensure it here as well and return the result.
        return NextResponse.json({ success: true, syncResult });

    } catch (error: any) {
        console.error('Deploy error:', error);
        return NextResponse.json({ error: error.message || 'Failed to deploy campaign' }, { status: 500 });
    }
}

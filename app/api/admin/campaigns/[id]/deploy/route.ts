import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncToGoogleAds } from '@/lib/ads/google-ads';
import { syncToMetaAds } from '@/lib/ads/meta-ads';
import { requireAdmin } from '@/lib/authz';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    let session;
    try {
        session = await requireAdmin();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = params;

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

        // 2. Approval Gate: Find APPROVED Ad Plan
        const approvedAsset = await prisma.generatedAsset.findFirst({
            where: {
                campaignRunId: latestRun.id,
                type: 'AD_PLAN',
                status: 'APPROVED'
            }
        });

        if (!approvedAsset) {
            return NextResponse.json({
                error: 'Deployment blocked. The Ad Plan has not been approved yet.'
            }, { status: 400 });
        }

        // 2. Sync to Platforms (Live Mode: dryRun = false)
        const body = await request.json().catch(() => ({}));
        const requested = Array.isArray(body.platforms) ? body.platforms : [];
        const selectedPlatforms = (requested.length ? requested : ['GOOGLE_ADS', 'META_ADS'])
            .filter((p: any) => p === 'GOOGLE_ADS' || p === 'META_ADS');

        console.log(`[Deploy] Deploying campaign ${campaign.slug} (Run: ${latestRun.id}) to platforms: ${selectedPlatforms.join(', ')}`);

        // 2b. Clear any simulated metrics before deploying (clean slate for real data)
        await prisma.campaignMetric.deleteMany({
            where: { campaignRunId: latestRun.id }
        });
        console.log(`[Deploy] Cleared simulated metrics for run ${latestRun.id}`);

        let googleSyncResult = null;
        if (selectedPlatforms.includes('GOOGLE_ADS')) {
            googleSyncResult = await syncToGoogleAds(latestRun.id, false);
        }

        let metaSyncResult = null;
        if (selectedPlatforms.includes('META_ADS') && process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID) {
            console.log(`[Deploy] Deploying to Meta Ads for run ${latestRun.id}`);
            metaSyncResult = await syncToMetaAds(latestRun.id, false);
        }

        // 4. Update Status
        await prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: 'ACTIVE' }
        });
        await prisma.campaignRun.update({
            where: { id: latestRun.id },
            data: { status: 'DEPLOYED' }
        });

        // 5. Record Audit Log
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                action: 'DEPLOY_CAMPAIGN',
                entityType: 'Campaign',
                entityId: campaign.id,
                metadata: {
                    runId: latestRun.id,
                    assetId: approvedAsset.id,
                    googleSyncResult,
                    metaSyncResult
                }
            }
        });

        return NextResponse.json({
            success: true,
            googleSyncResult,
            metaSyncResult
        });

    } catch (error: any) {
        console.error('Deploy error:', error);
        return NextResponse.json({ error: error.message || 'Failed to deploy campaign' }, { status: 500 });
    }
}

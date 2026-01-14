import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';
import { PipelineManager } from '@/lib/ads/pipeline';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await requireAdmin();
    const { id } = await params;

    try {
        const body = await request.json();
        const { adPlan, landingPageSpec } = body;

        if (!adPlan || !landingPageSpec) {
            return NextResponse.json({ error: 'Invalid input: adPlan and landingPageSpec are required' }, { status: 400 });
        }

        // 1. Fetch Campaign
        const campaign = await prisma.campaign.findUnique({
            where: { id }
        });

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        // 2. Create or Fetch CampaignRun
        let run = await prisma.campaignRun.findFirst({
            where: { campaignId: campaign.id },
            orderBy: { createdAt: 'desc' }
        });

        // If latest run is already live or ready, or if we want a fresh run for this import
        // For import, usually creating a new run is cleaner
        run = await prisma.campaignRun.create({
            data: {
                campaignId: campaign.id,
                status: 'DRAFT'
            }
        });

        // 3. Save Artifacts for persistence
        await PipelineManager.saveArtifact(run.id, 'LANDING_PAGE_SPEC', landingPageSpec);
        await PipelineManager.saveArtifact(run.id, 'AD_PLAN', adPlan);

        // 4. Update CampaignRun with all fields
        const updatedRun = await prisma.campaignRun.update({
            where: { id: run.id },
            data: {
                landingPageContent: JSON.stringify(landingPageSpec),
                chosenKeywords: adPlan.keywords.map((k: any) => k.text),
                matchTypes: adPlan.keywords.map((k: any) => k.matchType),
                rsaHeadlines: adPlan.rsa.headlines,
                rsaDescriptions: adPlan.rsa.descriptions,
                status: 'READY_FOR_REVIEW'
            }
        });

        // 5. Update Campaign Status
        await prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: 'READY' }
        });

        // 6. Record Audit Log
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                action: 'MANUAL_IMPORT',
                entityType: 'CampaignRun',
                entityId: run.id,
                metadata: {
                    campaignId: campaign.id,
                    source: 'EXTERNAL_AI'
                }
            }
        });

        return NextResponse.json(updatedRun);
    } catch (error: any) {
        console.error('Error importing assets:', error);
        return NextResponse.json({ error: error.message || 'Failed to import assets' }, { status: 500 });
    }
}

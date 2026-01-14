import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';
import { PipelineManager } from '@/lib/ads/pipeline';

export async function POST(request: Request) {
    const session = await requireAdmin();

    try {
        const body = await request.json();
        const { campaign, adPlan, landingPageSpec } = body;

        if (!campaign || !adPlan || !landingPageSpec) {
            return NextResponse.json({ error: 'Missing core data: campaign, adPlan, and landingPageSpec are required.' }, { status: 400 });
        }

        // 1. Create the Campaign record first
        const newCampaign = await prisma.campaign.create({
            data: {
                slug: campaign.slug,
                persona: campaign.persona,
                intent: campaign.intent,
                landingSlug: campaign.landingSlug || campaign.slug,
                seedKeywords: campaign.seedKeywords || [],
                benefits: campaign.benefits || [],
                proofPoints: campaign.proofPoints || [],
                disclaimers: campaign.disclaimers || [],
                budgetDaily: parseFloat(campaign.budgetDaily) || 50,
                targetCpa: parseFloat(campaign.targetCpa) || 30,
                geo: campaign.geo || 'US',
                tone: campaign.tone || 'Professional',
                status: 'READY'
            }
        });

        // 2. Create the CampaignRun
        const run = await prisma.campaignRun.create({
            data: {
                campaignId: newCampaign.id,
                status: 'READY_FOR_REVIEW',
                landingPageContent: JSON.stringify(landingPageSpec),
                chosenKeywords: adPlan.keywords.map((k: any) => k.text),
                matchTypes: adPlan.keywords.map((k: any) => k.matchType),
                rsaHeadlines: adPlan.rsa.headlines,
                rsaDescriptions: adPlan.rsa.descriptions,
            }
        });

        // 3. Save Artifacts for persistence
        await PipelineManager.saveArtifact(run.id, 'LANDING_PAGE_SPEC', landingPageSpec);
        await PipelineManager.saveArtifact(run.id, 'AD_PLAN', adPlan);

        // 4. Record Audit Log
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                action: 'MANUAL_GLOBAL_IMPORT',
                entityType: 'Campaign',
                entityId: newCampaign.id,
                metadata: { source: 'EXTERNAL_AI' }
            }
        });

        return NextResponse.json(newCampaign);
    } catch (error: any) {
        console.error('Error in global AI import:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

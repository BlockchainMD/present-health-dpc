import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateLandingPageSpec } from '@/lib/ads/generator';
import { PipelineManager } from '@/lib/ads/pipeline';
import { generateOptimizedAdPlan } from '@/lib/ads/optimizer';
import { requireAdmin } from '@/lib/authz';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    let session;
    try {
        session = await requireAdmin();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    try {
        // 1. Fetch Campaign
        const campaign = await prisma.campaign.findUnique({
            where: { id }
        });

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        // 2. Initial CampaignRun if not exists
        let run = await prisma.campaignRun.findFirst({
            where: { campaignId: campaign.id },
            orderBy: { createdAt: 'desc' }
        });

        if (!run) {
            run = await prisma.campaignRun.create({
                data: {
                    campaignId: campaign.id,
                    status: 'DRAFT'
                }
            });
        }

        // 3. Generate Landing Page Spec Artifact
        const lpSpec = await generateLandingPageSpec(campaign.id);
        await PipelineManager.saveArtifact(run.id, 'LANDING_PAGE_SPEC', lpSpec);

        // 4. Generate Ad Plan Artifact
        const campaignInput: Parameters<typeof generateOptimizedAdPlan>[0] = {
            id: campaign.id,
            slug: campaign.slug,
            persona: campaign.persona,
            intent: campaign.intent,
            seedKeywords: campaign.seedKeywords,
            strategy: campaign.strategy === 'EDUCATIONAL' ? 'EDUCATIONAL' : 'TRANSACTIONAL',
            layoutType: campaign.layoutType === 'EDUCATIONAL' ? 'EDUCATIONAL' : 'CONVERSION',
            benefits: campaign.benefits,
            proofPoints: campaign.proofPoints,
            disclaimers: campaign.disclaimers,
            budgetDaily: campaign.budgetDaily,
            targetCpa: campaign.targetCpa,
            geo: campaign.geo || "",
            tone: campaign.tone || "",
        };
        const adPlan = await generateOptimizedAdPlan(campaignInput);
        await PipelineManager.saveArtifact(run.id, 'AD_PLAN', adPlan);

        // 5. Update CampaignRun with all legacy fields (for backward compatibility of the LP Page)
        const updatedRun = await prisma.campaignRun.update({
            where: { id: run.id },
            data: {
                landingPageContent: JSON.stringify(lpSpec),
                chosenKeywords: adPlan.keywords.map(k => k.text),
                matchTypes: adPlan.keywords.map(k => k.matchType),
                rsaHeadlines: adPlan.rsa.headlines,
                rsaDescriptions: adPlan.rsa.descriptions,
                finalUrl: adPlan.finalUrl,
                status: 'READY_FOR_REVIEW'
            }
        });

        // 6. Update Campaign Status
        await prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: 'READY' }
        });

        // 7. Record Audit Log for Generation
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                action: 'GENERATE_ASSETS',
                entityType: 'CampaignRun',
                entityId: run.id,
                metadata: { campaignId: campaign.id }
            }
        });

        return NextResponse.json(updatedRun);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to generate assets';
        console.error('Error generating assets:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

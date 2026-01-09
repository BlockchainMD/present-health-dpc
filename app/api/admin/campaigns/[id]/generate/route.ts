import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateLandingPageSpec } from '@/lib/ads/generator';
import { generateKeywords } from '@/lib/ads/keywords';
import { generateAdPlan } from '@/lib/ads/google-ads';
import { PipelineManager } from '@/lib/ads/pipeline';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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
        const adPlan = await generateAdPlan(campaign as any);
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
                status: 'VALIDATED'
            }
        });

        // 6. Update Campaign Status
        await prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: 'READY' }
        });

        return NextResponse.json(updatedRun);
    } catch (error: any) {
        console.error('Error generating assets:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate assets' }, { status: 500 });
    }
}

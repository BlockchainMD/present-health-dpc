import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';
import { PipelineManager } from '@/lib/ads/pipeline';

export async function POST(request: Request) {
    try {
        const session = await requireAdmin();

        const body = await request.json();
        const { campaign, adPlan, landingPageSpec } = body;

        if (!campaign || !adPlan || !landingPageSpec) {
            return NextResponse.json({ error: 'Missing core data: campaign, adPlan, and landingPageSpec are required.' }, { status: 400 });
        }

        if (!campaign.slug) {
            return NextResponse.json({ error: 'Campaign slug is required.' }, { status: 400 });
        }

        // Check if slug already exists to provide a better error than Prisma crash
        const existing = await prisma.campaign.findUnique({
            where: { slug: campaign.slug }
        });

        if (existing) {
            return NextResponse.json({
                error: `A campaign with the slug "${campaign.slug}" already exists. Please use a unique slug.`
            }, { status: 409 });
        }

        // 1. Create the Campaign record
        const newCampaign = await prisma.campaign.create({
            data: {
                slug: campaign.slug,
                persona: campaign.persona || 'Unknown Persona',
                intent: campaign.intent || 'Unknown Intent',
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
        // Safely extract keywords/matchTypes to avoid mapping over undefined
        const keywords = adPlan.keywords || [];
        const rsa = adPlan.rsa || { headlines: [], descriptions: [] };

        const run = await prisma.campaignRun.create({
            data: {
                campaignId: newCampaign.id,
                status: 'READY_FOR_REVIEW',
                landingPageContent: JSON.stringify(landingPageSpec),
                chosenKeywords: keywords.map((k: any) => k.text || k.keyword || ''),
                matchTypes: keywords.map((k: any) => k.matchType || k.match_type || 'PHRASE'),
                rsaHeadlines: rsa.headlines || [],
                rsaDescriptions: rsa.descriptions || [],
            }
        });

        // 3. Save Artifacts for persistence
        await PipelineManager.saveArtifact(run.id, 'LANDING_PAGE_SPEC', landingPageSpec);
        await PipelineManager.saveArtifact(run.id, 'AD_PLAN', adPlan);

        // 4. Record Audit Log
        await prisma.auditLog.create({
            data: {
                actorUserId: (session.user as any).id,
                action: 'MANUAL_GLOBAL_IMPORT',
                entityType: 'Campaign',
                entityId: newCampaign.id,
                metadata: { source: 'EXTERNAL_AI' }
            }
        });

        return NextResponse.json(newCampaign);
    } catch (error: any) {
        console.error('Error in global AI import:', error);
        return NextResponse.json({ error: error.message || 'An internal error occurred during import' }, { status: 500 });
    }
}

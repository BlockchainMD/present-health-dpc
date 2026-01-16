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

        // Check if slug already exists
        const existing = await prisma.campaign.findUnique({
            where: { slug: campaign.slug }
        });

        if (existing) {
            return NextResponse.json({
                error: `A campaign with the slug "${campaign.slug}" already exists. Please use a unique slug.`
            }, { status: 409 });
        }

        // 1. Sanitize Campaign Data
        const safeBudget = parseFloat(campaign.budgetDaily);
        const safeCpa = parseFloat(campaign.targetCpa);

        const newCampaign = await prisma.campaign.create({
            data: {
                slug: campaign.slug,
                persona: campaign.persona || 'Unknown Persona',
                intent: campaign.intent || 'Unknown Intent',
                landingSlug: campaign.landingSlug || campaign.slug,
                seedKeywords: Array.isArray(campaign.seedKeywords) ? campaign.seedKeywords : [],
                benefits: Array.isArray(campaign.benefits) ? campaign.benefits : [],
                proofPoints: Array.isArray(campaign.proofPoints) ? campaign.proofPoints : [],
                disclaimers: Array.isArray(campaign.disclaimers) ? campaign.disclaimers : [],
                budgetDaily: isNaN(safeBudget) ? 50.0 : safeBudget,
                targetCpa: isNaN(safeCpa) ? 30.0 : safeCpa,
                geo: campaign.geo || 'US',
                geoStates: Array.isArray(campaign.geoStates) ? campaign.geoStates : [],
                tone: campaign.tone || 'Professional',
                status: 'READY'
            }
        });

        // 2. Sanitize and Create CampaignRun
        const rawKeywords = Array.isArray(adPlan.keywords) ? adPlan.keywords : [];
        const rsa = adPlan.rsa || { headlines: [], descriptions: [] };

        const run = await prisma.campaignRun.create({
            data: {
                campaignId: newCampaign.id,
                status: 'READY_FOR_REVIEW',
                landingPageContent: JSON.stringify(landingPageSpec),
                chosenKeywords: rawKeywords.map((k: any) => {
                    if (typeof k === 'string') return k;
                    return k.text || k.keyword || '';
                }).filter(Boolean),
                matchTypes: rawKeywords.map((k: any) => {
                    if (typeof k === 'string') return 'PHRASE';
                    return k.matchType || k.match_type || 'PHRASE';
                }),
                rsaHeadlines: Array.isArray(rsa.headlines) ? rsa.headlines : [],
                rsaDescriptions: Array.isArray(rsa.descriptions) ? rsa.descriptions : [],
            }
        });

        // 3. Save Artifacts
        try {
            await PipelineManager.saveArtifact(run.id, 'LANDING_PAGE_SPEC', landingPageSpec);
            await PipelineManager.saveArtifact(run.id, 'AD_PLAN', adPlan);
        } catch (artifactErr) {
            console.error('[Import] Failed to save secondary artifacts:', artifactErr);
            // Non-fatal for the main import record, but good to know
        }

        // 4. Record Audit Log
        try {
            await prisma.auditLog.create({
                data: {
                    actorUserId: (session.user as any)?.id || null,
                    action: 'MANUAL_GLOBAL_IMPORT',
                    entityType: 'Campaign',
                    entityId: newCampaign.id,
                    metadata: { source: 'EXTERNAL_AI' }
                }
            });
        } catch (auditErr) {
            console.error('[Import] Failed to create audit log:', auditErr);
        }

        return NextResponse.json(newCampaign);
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        console.error('CRITICAL: Error in global AI import:', error);
        return NextResponse.json({
            error: error.message || 'An internal error occurred during import',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}

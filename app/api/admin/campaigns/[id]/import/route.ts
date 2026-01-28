import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';
import { PipelineManager } from '@/lib/ads/pipeline';

/**
 * Sanitizes content by removing markdown citation patterns like "([Present Health][1])"
 */
function sanitizeContent(text: string): string {
    if (!text) return text;
    return text.replace(/\s*\(\[[^\]]+\]\[[^\]]+\]\)/g, '');
}

function sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
        return sanitizeContent(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const key of Object.keys(obj)) {
            result[key] = sanitizeObject(obj[key]);
        }
        return result;
    }
    return obj;
}

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
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        // Sanitize imported content to remove markdown citation patterns
        const adPlan = sanitizeObject((body as any).adPlan);
        const landingPageSpec = sanitizeObject((body as any).landingPageSpec);

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
        const keywords = Array.isArray(adPlan.keywords) ? adPlan.keywords : [];
        const rsa = adPlan.rsa || { headlines: [], descriptions: [] };
        const updatedRun = await prisma.campaignRun.update({
            where: { id: run.id },
            data: {
                landingPageContent: JSON.stringify(landingPageSpec),
                chosenKeywords: keywords.map((k: any) => k.text || k.keyword || '').filter(Boolean),
                matchTypes: keywords.map((k: any) => k.matchType || k.match_type || 'PHRASE'),
                rsaHeadlines: Array.isArray(rsa.headlines) ? rsa.headlines : [],
                rsaDescriptions: Array.isArray(rsa.descriptions) ? rsa.descriptions : [],
                finalUrl: adPlan.finalUrl || `https://presenthealthmd.com/lp/${campaign.landingSlug}`,
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

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateCampaignSpec } from '@/lib/ads/compliance';

export async function GET() {
    try {
        const campaigns = await prisma.campaign.findMany({
            orderBy: { updatedAt: 'desc' },
            include: {
                runs: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                }
            }
        });
        return NextResponse.json(campaigns);
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    console.log('[POST /api/admin/campaigns] Request received');
    try {
        const body = await request.json();
        console.log('[POST /api/admin/campaigns] Body parsed:', body.slug);

        // 1. Basic Validation
        if (!body.slug || !body.persona || !body.intent || !body.landingSlug) {
            console.log('[POST /api/admin/campaigns] Validation failed: missing fields');
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        console.log('[POST /api/admin/campaigns] Validation passed');

        // 2. Compliance Check (Pre-screen)
        const compliance = validateCampaignSpec(body);
        if (compliance.status === 'FAIL') {
            console.log('[POST /api/admin/campaigns] Compliance failed:', compliance.reasons);
            return NextResponse.json({
                error: 'Compliance check failed',
                reasons: compliance.reasons
            }, { status: 400 });
        }
        console.log('[POST /api/admin/campaigns] Compliance passed');

        // 3. Create Campaign
        console.log('[POST /api/admin/campaigns] Calling prisma.campaign.create...');
        const campaign = await prisma.campaign.create({
            data: {
                slug: body.slug,
                persona: body.persona,
                intent: body.intent,
                seedKeywords: body.seedKeywords || [],
                benefits: body.benefits || [],
                proofPoints: body.proofPoints || [],
                disclaimers: body.disclaimers || [],
                landingSlug: body.landingSlug,
                budgetDaily: parseFloat(body.budgetDaily) || 50,
                targetCpa: parseFloat(body.targetCpa) || 30,
                geo: body.geo || 'US',
                tone: body.tone || 'Professional',
                status: 'DRAFT'
            }
        });
        console.log('[POST /api/admin/campaigns] Campaign created:', campaign.id);

        return NextResponse.json(campaign);
    } catch (error: any) {
        console.error('[POST /api/admin/campaigns] ERROR:', error.message, error.code, error.meta);
        return NextResponse.json({ error: 'Failed to create campaign', details: error.message }, { status: 500 });
    }
}

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
        const bodyText = await request.text();
        console.log('[POST /api/admin/campaigns] Raw body length:', bodyText.length);

        let body;
        try {
            body = JSON.parse(bodyText);
            console.log('[POST /api/admin/campaigns] Body parsed successfully. Slug:', body.slug);
        } catch (e) {
            console.error('[POST /api/admin/campaigns] Failed to parse JSON body:', e);
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        // 1. Basic Validation
        if (!body.slug || !body.persona || !body.intent || !body.landingSlug) {
            console.log('[POST /api/admin/campaigns] Validation failed: missing fields', {
                slug: !!body.slug,
                persona: !!body.persona,
                intent: !!body.intent,
                landingSlug: !!body.landingSlug
            });
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        console.log('[POST /api/admin/campaigns] Validation passed');

        // 2. Compliance Check (Pre-screen)
        console.log('[POST /api/admin/campaigns] Running compliance check...');
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
        const campaignData = {
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
        };
        console.log('[POST /api/admin/campaigns] Prisma create data prepared:', JSON.stringify(campaignData, null, 2));

        const campaign = await prisma.campaign.create({
            data: campaignData
        });
        console.log('[POST /api/admin/campaigns] Campaign created successfully:', campaign.id);

        return NextResponse.json(campaign);
    } catch (error: any) {
        console.error('[POST /api/admin/campaigns] ERROR:', error);
        console.error('[POST /api/admin/campaigns] ERROR STACK:', error.stack);
        return NextResponse.json({ error: 'Failed to create campaign', details: error.message }, { status: 500 });
    }
}

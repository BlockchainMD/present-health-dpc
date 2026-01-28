import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateCampaignSpec } from '@/lib/ads/compliance';
import { requireAdmin } from '@/lib/authz';

function normalizeSlug(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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

        const slug = normalizeSlug(body.slug);
        const landingSlug = normalizeSlug(body.landingSlug);
        if (!slug || !landingSlug) {
            return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
        }

        const existing = await prisma.campaign.findUnique({ where: { slug } });
        if (existing) {
            return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
        }

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
        const budgetDaily = Number(body.budgetDaily);
        const targetCpa = Number(body.targetCpa);
        const campaignData = {
            slug,
            persona: body.persona,
            intent: body.intent,
            seedKeywords: Array.isArray(body.seedKeywords) ? body.seedKeywords : [],
            benefits: Array.isArray(body.benefits) ? body.benefits : [],
            proofPoints: Array.isArray(body.proofPoints) ? body.proofPoints : [],
            disclaimers: Array.isArray(body.disclaimers) ? body.disclaimers : [],
            landingSlug,
            budgetDaily: Number.isFinite(budgetDaily) ? budgetDaily : 50,
            targetCpa: Number.isFinite(targetCpa) ? targetCpa : 30,
            geo: body.geo || 'US',
            geoStates: body.geoStates || [],
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
        if (error?.code === 'P2002') {
            return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
        }
        console.error('[POST /api/admin/campaigns] ERROR:', error);
        console.error('[POST /api/admin/campaigns] ERROR STACK:', error.stack);
        return NextResponse.json({ error: 'Failed to create campaign', details: error.message }, { status: 500 });
    }
}

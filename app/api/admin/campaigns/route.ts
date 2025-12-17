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
    try {
        const body = await request.json();

        // 1. Basic Validation
        if (!body.slug || !body.persona || !body.intent || !body.landingSlug) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 2. Compliance Check (Pre-screen)
        const compliance = validateCampaignSpec(body);
        if (compliance.status === 'FAIL') {
            return NextResponse.json({
                error: 'Compliance check failed',
                reasons: compliance.reasons
            }, { status: 400 });
        }

        // 3. Create Campaign
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

        return NextResponse.json(campaign);
    } catch (error) {
        console.error('Error creating campaign:', error);
        return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }
}

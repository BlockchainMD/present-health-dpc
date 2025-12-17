import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateLandingPage } from '@/lib/ads/generator';
import { generateKeywords } from '@/lib/ads/keywords';
import { generateAdAssets } from '@/lib/ads/google-ads';

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

        // 2. Generate Landing Page (This creates/updates the CampaignRun)
        const run = await generateLandingPage(campaign.id);

        // 3. Generate Keywords
        const keywordResults = generateKeywords(campaign.seedKeywords);
        const keywords = keywordResults.map(k => k.keyword);
        const matchTypes = keywordResults.map(k => k.matchType);

        // 4. Generate Ads
        const adAssets = generateAdAssets(campaign);

        // 5. Update CampaignRun with all assets
        const updatedRun = await prisma.campaignRun.update({
            where: { id: run.id },
            data: {
                chosenKeywords: keywords,
                matchTypes: matchTypes,
                rsaHeadlines: adAssets.headlines,
                rsaDescriptions: adAssets.descriptions,
                status: 'VALIDATED' // Assuming all generators run internal validation
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

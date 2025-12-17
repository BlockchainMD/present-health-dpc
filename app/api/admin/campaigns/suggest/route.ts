import { NextResponse } from 'next/server';
import { generateCampaignSpec } from '@/lib/ads/ai-campaign';

export async function POST() {
    try {
        const spec = await generateCampaignSpec();
        return NextResponse.json(spec);
    } catch (error: any) {
        console.error('Error generating campaign suggestion:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate suggestion' }, { status: 500 });
    }
}

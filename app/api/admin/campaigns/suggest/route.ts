import { NextResponse } from 'next/server';
import { generateCampaignSpec } from '@/lib/ads/ai-campaign';
import { requireAdmin } from '@/lib/authz';

export async function POST() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const spec = await generateCampaignSpec();
        return NextResponse.json(spec);
    } catch (error: any) {
        console.error('Error generating campaign suggestion:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate suggestion' }, { status: 500 });
    }
}

import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/authz';
import { getSeoHealthReport } from '@/lib/seo-health/service';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const report = await getSeoHealthReport();
        return NextResponse.json({ success: true, report });
    } catch (error: any) {
        console.error('SEO health error:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to fetch SEO health' },
            { status: 500 }
        );
    }
}

import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/authz';
import { getSeoHealthSnapshot } from '@/lib/seo-health/service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const refresh = new URL(request.url).searchParams.get('refresh') === '1';
        const snapshot = await getSeoHealthSnapshot({ refresh, refreshIfStale: true });
        return NextResponse.json({
            success: true,
            report: snapshot.report,
            meta: {
                updatedAt: snapshot.updatedAt,
                cached: snapshot.cached,
                stale: snapshot.stale,
                config: snapshot.config
            }
        });
    } catch (error: any) {
        console.error('SEO health error:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to fetch SEO health' },
            { status: 500 }
        );
    }
}

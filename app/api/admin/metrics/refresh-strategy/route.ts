import { NextResponse } from 'next/server';
import { refreshStrategy } from '@/lib/content-engine/feedback';
import { requireAdmin } from '@/lib/authz';

export const runtime = 'nodejs';

export async function POST() {
    try {
        await requireAdmin();
        const strategy = await refreshStrategy();
        return NextResponse.json({ success: true, strategy });
    } catch (error) {
        const message = error instanceof Error && error.message.includes('Unauthorized')
            ? 'Unauthorized'
            : 'Failed to refresh strategy';
        const status = message === 'Unauthorized' ? 401 : 500;
        return NextResponse.json({ success: false, error: message }, { status });
    }
}

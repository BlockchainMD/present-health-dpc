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
        return NextResponse.json({ success: false, error: 'Failed to refresh strategy' }, { status: 500 });
    }
}

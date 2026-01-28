import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/authz';
import { getSeoHealthConfig, updateSeoHealthConfig } from '@/lib/seo-health/service';

export const runtime = 'nodejs';

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const config = await getSeoHealthConfig();
        return NextResponse.json({ success: true, config });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error?.message || 'Failed to load config' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json().catch(() => ({}));
        const patch = typeof body === 'object' && body !== null ? body : {};
        const config = await updateSeoHealthConfig(patch);
        return NextResponse.json({ success: true, config });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error?.message || 'Failed to update config' }, { status: 500 });
    }
}

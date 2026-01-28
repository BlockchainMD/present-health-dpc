import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authz';
import { syncGscMetrics } from '@/lib/content-engine/gsc';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const authorized = await verifyMetricsAuth(request);
        if (!authorized) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const requestedDays = Number(body.days || 7);
        const days = Number.isFinite(requestedDays) && requestedDays > 0 ? Math.min(requestedDays, 90) : 7;
        const result = await syncGscMetrics({ days });
        await prisma.auditLog.create({
            data: {
                actorUserId: null,
                action: 'GSC_SYNC',
                entityType: 'ArticleMetric',
                entityId: 'GSC',
                metadata: { days, ...result }
            }
        });
        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: String(error?.message || error) }, { status: 500 });
    }
}

async function verifyMetricsAuth(request: Request) {
    const secret = process.env.CONTENT_ENGINE_METRICS_SECRET || process.env.CONTENT_ENGINE_CRON_SECRET;
    if (secret) {
        const header = request.headers.get('x-metrics-secret');
        const bearer = request.headers.get('authorization')?.replace('Bearer ', '');
        if (header === secret || bearer === secret) return true;
    }
    try {
        await requireAdmin();
        return true;
    } catch {
        return false;
    }
}

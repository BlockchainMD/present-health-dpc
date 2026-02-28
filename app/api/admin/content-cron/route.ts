import { NextResponse, NextRequest } from 'next/server';
import { enqueueDueSchedules, runDueJobs } from '@/lib/content-engine/scheduler';
import { requireAdmin } from '@/lib/authz';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const authorized = await verifyCronAuth(request);
        if (!authorized) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const body = await request.json().catch(() => ({}));
        const parsedLimit = Number(body.jobLimit ?? 3);
        const jobLimit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 10) : 3;

        const enqueued = await enqueueDueSchedules();
        const processed = await runDueJobs(jobLimit);

        // Revalidate the hub pages so newly published articles appear immediately
        // rather than waiting for the ISR revalidation window.
        if (processed > 0) {
            try {
                revalidatePath('/learn');
                revalidatePath('/blog');
            } catch {
                // Non-fatal: revalidation may not be available in all environments.
            }
        }

        return NextResponse.json({ success: true, enqueued, processed });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to run scheduler' }, { status: 500 });
    }
}

async function verifyCronAuth(request: NextRequest) {
    const secret = process.env.CONTENT_ENGINE_CRON_SECRET;
    if (secret) {
        const header = request.headers.get('x-cron-secret');
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

import { NextResponse } from 'next/server';
import { enqueueDueSchedules, runDueJobs } from '@/lib/content-engine/scheduler';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const jobLimit = body.jobLimit ? Number(body.jobLimit) : 3;

        const enqueued = await enqueueDueSchedules();
        const processed = await runDueJobs(jobLimit);

        return NextResponse.json({ success: true, enqueued, processed });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to run scheduler' }, { status: 500 });
    }
}

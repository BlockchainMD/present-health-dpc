import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const jobs = await prisma.contentJob.findMany({
            orderBy: { runAt: 'desc' },
            take: 50,
            include: { schedule: true }
        });
        return NextResponse.json({ success: true, jobs });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch jobs' }, { status: 500 });
    }
}

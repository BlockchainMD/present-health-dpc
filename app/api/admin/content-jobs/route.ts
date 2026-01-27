import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
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

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const schedules = await prisma.contentSchedule.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ success: true, schedules });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch schedules' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const schedule = await prisma.contentSchedule.create({
            data: {
                name: body.name || 'Daily Content',
                enabled: body.enabled ?? true,
                timezone: body.timezone || 'America/Chicago',
                cadence: body.cadence || 'DAILY',
                runHour: Number(body.runHour ?? 8),
                runMinute: Number(body.runMinute ?? 0),
                maxDaily: body.maxDaily ? Number(body.maxDaily) : null,
                options: body.options || {}
            }
        });

        return NextResponse.json({ success: true, schedule });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to create schedule' }, { status: 500 });
    }
}

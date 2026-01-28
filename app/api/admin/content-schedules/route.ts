import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';

function isValidTimeZone(value: string) {
    try {
        Intl.DateTimeFormat('en-US', { timeZone: value });
        return true;
    } catch {
        return false;
    }
}

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const schedules = await prisma.contentSchedule.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ success: true, schedules });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch schedules' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    let session;
    try {
        session = await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
        }
        if (body.timezone && typeof body.timezone === 'string' && !isValidTimeZone(body.timezone)) {
            return NextResponse.json({ success: false, error: 'Invalid timezone' }, { status: 400 });
        }
        const runHour = Number(body.runHour ?? 8);
        const runMinute = Number(body.runMinute ?? 0);
        if (!Number.isFinite(runHour) || runHour < 0 || runHour > 23) {
            return NextResponse.json({ success: false, error: 'runHour must be between 0 and 23' }, { status: 400 });
        }
        if (!Number.isFinite(runMinute) || runMinute < 0 || runMinute > 59) {
            return NextResponse.json({ success: false, error: 'runMinute must be between 0 and 59' }, { status: 400 });
        }
        const maxDaily = body.maxDaily === null || body.maxDaily === undefined ? null : Number(body.maxDaily);
        if (maxDaily !== null && (!Number.isFinite(maxDaily) || maxDaily < 1)) {
            return NextResponse.json({ success: false, error: 'maxDaily must be a positive number' }, { status: 400 });
        }
        const cadence = body.cadence || 'DAILY';
        if (!['DAILY', 'HOURLY'].includes(cadence)) {
            return NextResponse.json({ success: false, error: 'Invalid cadence' }, { status: 400 });
        }
        const schedule = await prisma.contentSchedule.create({
            data: {
                name: body.name || 'Daily Content',
                enabled: body.enabled ?? true,
                timezone: body.timezone || 'America/Chicago',
                cadence,
                runHour,
                runMinute,
                maxDaily,
                options: body.options && typeof body.options === 'object' ? body.options : {}
            }
        });

        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                action: 'CREATE_CONTENT_SCHEDULE',
                entityType: 'ContentSchedule',
                entityId: schedule.id,
                metadata: {
                    name: schedule.name,
                    cadence: schedule.cadence,
                    options: schedule.options
                }
            }
        });

        return NextResponse.json({ success: true, schedule });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to create schedule' }, { status: 500 });
    }
}

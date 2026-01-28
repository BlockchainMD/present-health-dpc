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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    let session;
    try {
        session = await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { id } = await params;
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
        }

        const updateData: any = {};
        const fields = ['name', 'enabled', 'timezone', 'cadence', 'runHour', 'runMinute', 'lastRunAt', 'options', 'maxDaily'];
        for (const field of fields) {
            if (body[field] !== undefined) updateData[field] = body[field];
        }

        if (updateData.options && typeof updateData.options !== 'object') {
            return NextResponse.json({ success: false, error: 'options must be an object' }, { status: 400 });
        }
        if (updateData.cadence && !['DAILY', 'HOURLY'].includes(updateData.cadence)) {
            return NextResponse.json({ success: false, error: 'Invalid cadence' }, { status: 400 });
        }
        if (updateData.timezone && typeof updateData.timezone === 'string' && !isValidTimeZone(updateData.timezone)) {
            return NextResponse.json({ success: false, error: 'Invalid timezone' }, { status: 400 });
        }

        if (updateData.runHour !== undefined) {
            const runHour = Number(updateData.runHour);
            if (!Number.isFinite(runHour) || runHour < 0 || runHour > 23) {
                return NextResponse.json({ success: false, error: 'runHour must be between 0 and 23' }, { status: 400 });
            }
            updateData.runHour = runHour;
        }
        if (updateData.runMinute !== undefined) {
            const runMinute = Number(updateData.runMinute);
            if (!Number.isFinite(runMinute) || runMinute < 0 || runMinute > 59) {
                return NextResponse.json({ success: false, error: 'runMinute must be between 0 and 59' }, { status: 400 });
            }
            updateData.runMinute = runMinute;
        }
        if (updateData.maxDaily !== undefined && updateData.maxDaily !== null) {
            const maxDaily = Number(updateData.maxDaily);
            if (!Number.isFinite(maxDaily) || maxDaily < 1) {
                return NextResponse.json({ success: false, error: 'maxDaily must be a positive number' }, { status: 400 });
            }
            updateData.maxDaily = maxDaily;
        }

        const schedule = await prisma.contentSchedule.update({
            where: { id },
            data: updateData
        });

        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                action: 'UPDATE_CONTENT_SCHEDULE',
                entityType: 'ContentSchedule',
                entityId: schedule.id,
                metadata: updateData
            }
        });

        return NextResponse.json({ success: true, schedule });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to update schedule' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    let session;
    try {
        session = await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { id } = await params;
        const schedule = await prisma.contentSchedule.delete({ where: { id } });
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                action: 'DELETE_CONTENT_SCHEDULE',
                entityType: 'ContentSchedule',
                entityId: schedule.id,
                metadata: { name: schedule.name }
            }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to delete schedule' }, { status: 500 });
    }
}

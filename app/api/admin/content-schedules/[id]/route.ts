import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    let session;
    try {
        session = await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { id } = await params;
        const body = await request.json();

        const updateData: any = {};
        const fields = ['name', 'enabled', 'timezone', 'cadence', 'runHour', 'runMinute', 'lastRunAt', 'options', 'maxDaily'];
        for (const field of fields) {
            if (body[field] !== undefined) updateData[field] = body[field];
        }

        if (updateData.runHour !== undefined) updateData.runHour = Number(updateData.runHour);
        if (updateData.runMinute !== undefined) updateData.runMinute = Number(updateData.runMinute);
        if (updateData.maxDaily !== undefined && updateData.maxDaily !== null) updateData.maxDaily = Number(updateData.maxDaily);

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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

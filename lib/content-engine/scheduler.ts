import { prisma } from '../prisma';
import { runContentEngine } from './engine';
import { EngineOptions } from './types';

export async function enqueueDueSchedules(now = new Date()) {
    const schedules = await prisma.contentSchedule.findMany({ where: { enabled: true } });
    let created = 0;

    for (const schedule of schedules) {
        const existingJob = await prisma.contentJob.findFirst({
            where: {
                scheduleId: schedule.id,
                status: { in: ['PENDING', 'RUNNING'] }
            }
        });
        if (existingJob) continue;

        const scheduledTime = computeScheduledTime(schedule.timezone, schedule.runHour, schedule.runMinute, now);
        if (now < scheduledTime) continue;
        if (schedule.lastRunAt && schedule.lastRunAt >= scheduledTime) continue;

        const options = normalizeOptions(schedule.options || {}, schedule.maxDaily || undefined);

        await prisma.$transaction([
            prisma.contentJob.create({
                data: {
                    scheduleId: schedule.id,
                    runAt: now,
                    options
                }
            }),
            prisma.contentSchedule.update({
                where: { id: schedule.id },
                data: { lastRunAt: scheduledTime }
            })
        ]);

        created += 1;
    }

    return created;
}

export async function runDueJobs(limit = 3) {
    const now = new Date();
    const jobs = await prisma.contentJob.findMany({
        where: {
            status: 'PENDING',
            runAt: { lte: now }
        },
        orderBy: { runAt: 'asc' },
        take: limit
    });

    let processed = 0;

    for (const job of jobs) {
        processed += 1;
        await prisma.contentJob.update({
            where: { id: job.id },
            data: { status: 'RUNNING', startedAt: new Date() }
        });

        try {
            const result = await runContentEngine(job.options as EngineOptions);
            await prisma.contentJob.update({
                where: { id: job.id },
                data: {
                    status: 'SUCCEEDED',
                    finishedAt: new Date(),
                    result: result as any
                }
            });
        } catch (error: any) {
            await prisma.contentJob.update({
                where: { id: job.id },
                data: {
                    status: 'FAILED',
                    finishedAt: new Date(),
                    error: String(error?.message || error)
                }
            });
        }
    }

    return processed;
}

function computeScheduledTime(timezone: string, hour: number, minute: number, now: Date) {
    const tzNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const scheduled = new Date(tzNow);
    scheduled.setHours(hour, minute, 0, 0);

    if (scheduled > tzNow) {
        return fromTimeZone(scheduled, now, timezone);
    }

    return fromTimeZone(scheduled, now, timezone);
}

function fromTimeZone(dateInTz: Date, now: Date, timezone: string) {
    const tzNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const offset = now.getTime() - tzNow.getTime();
    return new Date(dateInTz.getTime() + offset);
}

function normalizeOptions(options: Record<string, any>, maxDaily?: number) {
    const normalized: Record<string, any> = {
        count: 20,
        mode: 'BALANCED',
        autoPublish: false,
        useFeedback: true,
        ...options
    };
    if (maxDaily && typeof normalized.count === 'number') {
        normalized.count = Math.min(normalized.count, maxDaily);
    }
    return normalized;
}

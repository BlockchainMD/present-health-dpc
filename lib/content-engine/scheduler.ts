import { prisma } from '../prisma';
import { runContentEngine } from './engine';
import { EngineOptions } from './types';
import { sendAlert } from './alerts';
import { syncGscMetrics } from './gsc';
import { refreshStrategy } from './feedback';

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

        const scheduledTime = computeScheduledTime(schedule.cadence, schedule.timezone, schedule.runHour, schedule.runMinute, now);
        if (now < scheduledTime) continue;
        if (schedule.lastRunAt && schedule.lastRunAt >= scheduledTime) continue;

        const options = normalizeOptions(schedule.options, schedule.maxDaily || undefined);

        await prisma.$transaction([
            prisma.contentJob.create({
                data: {
                    scheduleId: schedule.id,
                    runAt: scheduledTime,
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
        const claimed = await prisma.contentJob.updateMany({
            where: { id: job.id, status: 'PENDING' },
            data: { status: 'RUNNING', startedAt: new Date() }
        });
        if (claimed.count === 0) continue;

        try {
            const jobType = (job.options as any)?.jobType || 'CONTENT';
            let result: any = null;

            if (jobType === 'GSC_SYNC') {
                const days = Number((job.options as any)?.days || 7);
                result = await syncGscMetrics({ days });
                if ((job.options as any)?.refreshStrategy) {
                    const strategy = await refreshStrategy();
                    result = { ...result, strategy };
                }
            } else if (jobType === 'REFRESH_STRATEGY') {
                result = await refreshStrategy();
            } else {
                result = await runContentEngine(job.options as EngineOptions);
            }

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
            await sendAlert({
                title: 'Content job failed',
                message: `Job ${job.id} failed with ${String(error?.message || error)}`,
                severity: 'ERROR',
                metadata: {
                    jobId: job.id,
                    scheduleId: job.scheduleId,
                    runAt: job.runAt.toISOString(),
                    status: 'FAILED'
                }
            });
        }
    }

    return processed;
}

function computeScheduledTime(cadence: string, timezone: string, hour: number, minute: number, now: Date) {
    let tzNow: Date;
    try {
        tzNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    } catch {
        tzNow = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    }
    const scheduled = new Date(tzNow);
    const cadenceMode = cadence === 'HOURLY' ? 'HOURLY' : 'DAILY';
    if (cadenceMode === 'HOURLY') {
        scheduled.setHours(tzNow.getHours(), minute, 0, 0);
    } else {
        scheduled.setHours(hour, minute, 0, 0);
    }

    return fromTimeZone(scheduled, now, timezone);
}

function fromTimeZone(dateInTz: Date, now: Date, timezone: string) {
    let tzNow: Date;
    try {
        tzNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    } catch {
        tzNow = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    }
    const offset = now.getTime() - tzNow.getTime();
    return new Date(dateInTz.getTime() + offset);
}

function normalizeOptions(options: unknown, maxDaily?: number) {
    const base = options && typeof options === 'object' && !Array.isArray(options)
        ? options as Record<string, any>
        : {};
    const normalized: Record<string, any> = {
        count: 20,
        mode: 'BALANCED',
        autoPublish: false,
        useFeedback: true,
        jobType: 'CONTENT',
        ...base
    };
    if (maxDaily && typeof normalized.count === 'number') {
        normalized.count = Math.min(normalized.count, maxDaily);
    }
    return normalized;
}

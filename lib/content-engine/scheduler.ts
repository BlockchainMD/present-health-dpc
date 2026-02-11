import { prisma } from '../prisma';
import { runContentEngine } from './engine';
import { EngineOptions } from './types';
import { sendAlert } from './alerts';
import { syncGscMetrics } from './gsc';
import { refreshStrategy } from './feedback';
import { refreshSeoHealthSnapshot } from '../seo-health/service';
import { runContentRefreshDetection } from '../content-refresh';

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
            const jobOptions = job.options && typeof job.options === 'object' && !Array.isArray(job.options)
                ? job.options as Record<string, any>
                : {};
            const jobType = jobOptions.jobType || 'CONTENT';
            let result: any = null;

            if (jobType === 'GSC_SYNC') {
                const days = Number(jobOptions?.days || 7);
                result = await syncGscMetrics({ days });
                if (jobOptions?.refreshStrategy) {
                    const strategy = await refreshStrategy();
                    result = { ...result, strategy };
                }
            } else if (jobType === 'SEO_HEALTH') {
                result = await refreshSeoHealthSnapshot();
            } else if (jobType === 'REFRESH_STRATEGY') {
                const days = Number(jobOptions?.strategyDays || 30);
                result = await refreshStrategy(Number.isFinite(days) ? days : 30);
            } else if (jobType === 'CONTENT_REFRESH_DETECT') {
                result = await runContentRefreshDetection();
            } else {
                const preflight = await runContentPreflight(jobOptions);
                const engineResult = await runContentEngine(jobOptions as EngineOptions);
                const warnings = [
                    ...(engineResult.warnings || []),
                    ...(preflight.warnings || [])
                ];
                result = {
                    ...engineResult,
                    warnings,
                    preflight: preflight.results,
                    preflightConfig: preflight.config
                };
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
    if ((normalized.jobType || 'CONTENT') === 'CONTENT') {
        const preflightRaw = normalized.preflight;
        const preflightBase = preflightRaw && typeof preflightRaw === 'object' && !Array.isArray(preflightRaw)
            ? preflightRaw as Record<string, any>
            : {};
        const clamp = (value: any, min: number, max: number, fallback: number) => {
            const num = Number(value);
            if (!Number.isFinite(num)) return fallback;
            return Math.min(max, Math.max(min, num));
        };
        normalized.preflight = {
            seoHealthSnapshot: preflightBase.seoHealthSnapshot !== false,
            gscSync: preflightBase.gscSync !== false,
            gscDays: clamp(preflightBase.gscDays ?? 7, 1, 30, 7),
            refreshStrategy: preflightBase.refreshStrategy !== false,
            strategyDays: clamp(preflightBase.strategyDays ?? 30, 7, 90, 30)
        };
    }
    if (maxDaily && typeof normalized.count === 'number') {
        normalized.count = Math.min(normalized.count, maxDaily);
    }
    return normalized;
}

async function runContentPreflight(options: Record<string, any>) {
    const preflight = options.preflight && typeof options.preflight === 'object' && !Array.isArray(options.preflight)
        ? options.preflight as Record<string, any>
        : {};
    const config = {
        seoHealthSnapshot: preflight.seoHealthSnapshot !== false,
        gscSync: preflight.gscSync !== false,
        gscDays: Number.isFinite(Number(preflight.gscDays)) ? Number(preflight.gscDays) : 7,
        refreshStrategy: preflight.refreshStrategy !== false,
        strategyDays: Number.isFinite(Number(preflight.strategyDays)) ? Number(preflight.strategyDays) : 30
    };
    const results: Record<string, any> = {};
    const warnings: string[] = [];

    if (config.seoHealthSnapshot) {
        try {
            const snapshot = await refreshSeoHealthSnapshot();
            results.seoHealth = {
                status: snapshot.report.status,
                indexRate: snapshot.report.indexRate,
                updatedAt: snapshot.updatedAt
            };
        } catch (error) {
            warnings.push('SEO health snapshot refresh failed.');
            await sendAlert({
                title: 'SEO health snapshot failed',
                message: 'Failed to refresh SEO health snapshot before content run.',
                severity: 'WARN'
            });
        }
    }

    if (config.gscSync) {
        try {
            results.gscSync = await syncGscMetrics({ days: config.gscDays });
        } catch (error) {
            warnings.push('GSC sync failed.');
            await sendAlert({
                title: 'GSC sync failed',
                message: 'Failed to sync Search Console metrics before content run.',
                severity: 'WARN'
            });
        }
    }

    if (config.refreshStrategy) {
        try {
            results.strategy = await refreshStrategy(config.strategyDays);
        } catch (error) {
            warnings.push('Strategy refresh failed.');
            await sendAlert({
                title: 'Strategy refresh failed',
                message: 'Failed to refresh CTR-weighted strategy before content run.',
                severity: 'WARN'
            });
        }
    }

    return { config, results, warnings };
}

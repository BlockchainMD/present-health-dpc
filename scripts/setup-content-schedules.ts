/**
 * setup-content-schedules.ts
 *
 * Seeds the ContentSchedule table with the default automation jobs that the
 * content engine cron endpoint will enqueue and run.
 *
 * Safe to re-run: existing schedules with the same name are updated, not
 * duplicated.
 *
 * Usage:
 *   npx tsx scripts/setup-content-schedules.ts
 *
 * Run this once after deploying to a new environment, or whenever you want
 * to change the default schedule configuration.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Schedule definitions
// ---------------------------------------------------------------------------

interface ScheduleSpec {
    name: string;
    cadence: 'DAILY' | 'HOURLY';
    timezone: string;
    runHour: number;
    runMinute: number;
    maxDaily: number;
    options: Record<string, unknown>;
    description: string;
}

const SCHEDULES: ScheduleSpec[] = [
    // ── 1. Primary content generation (BALANCED mode) ──────────────────────
    // Runs once daily at 9am CT.  Generates up to 6 articles per run in
    // BALANCED mode (mix of trending, research, and curated topics).
    // autoPublish is true — LOW-risk articles are published immediately
    // into a staggered queue (9am, 1pm, 5pm, 9pm slots).
    {
        name: 'daily-balanced-content',
        cadence: 'DAILY',
        timezone: 'America/Chicago',
        runHour: 9,
        runMinute: 0,
        maxDaily: 6,
        options: {
            jobType: 'CONTENT',
            count: 6,
            mode: 'BALANCED',
            autoPublish: true,
            useFeedback: true,
            reviewType: 'CLINICAL',
            reviewLabel: 'Present Health Clinical Team',
            preflight: {
                seoHealthSnapshot: true,
                gscSync: true,
                gscDays: 7,
                refreshStrategy: true,
                strategyDays: 30,
            },
        },
        description: 'Daily balanced content generation — 6 articles, CLINICAL review',
    },

    // ── 2. Trend-focused content run (afternoon) ───────────────────────────
    // A second daily run at 2pm CT focused purely on trending topics and
    // breaking health news.  Smaller batch so it stays fast.
    {
        name: 'daily-trend-content',
        cadence: 'DAILY',
        timezone: 'America/Chicago',
        runHour: 14,
        runMinute: 0,
        maxDaily: 3,
        options: {
            jobType: 'CONTENT',
            count: 3,
            mode: 'TREND',
            autoPublish: true,
            useFeedback: true,
            reviewType: 'CLINICAL',
            reviewLabel: 'Present Health Clinical Team',
            preflight: {
                seoHealthSnapshot: false, // already ran this morning
                gscSync: false,
                refreshStrategy: false,
            },
        },
        description: 'Afternoon trend-focused content generation — 3 articles',
    },

    // ── 3. Research-focused content run (evenings, 3× per week) ───────────
    // Monday, Wednesday, Friday at 7pm CT.  Pulls from PubMed, NIH, and
    // ClinicalTrials for evidence-based longevity / preventive care articles.
    // Lower maxDaily because research articles tend to be higher effort.
    {
        name: 'mwf-research-content',
        cadence: 'DAILY',   // Cadence is DAILY; Cloud Scheduler cron handles MWF
        timezone: 'America/Chicago',
        runHour: 19,
        runMinute: 0,
        maxDaily: 4,
        options: {
            jobType: 'CONTENT',
            count: 4,
            mode: 'RESEARCH',
            autoPublish: true,
            useFeedback: true,
            reviewType: 'CLINICAL',
            reviewLabel: 'Present Health Clinical Team',
            daysOfWeek: [1, 3, 5],  // Mon=1, Wed=3, Fri=5 — skip other days
            sources: {
                trends: false,
                news: false,
                pubmed: true,
                trials: true,
                nih: true,
                cdc: true,
                curated: false,
            },
            preflight: {
                seoHealthSnapshot: false,
                gscSync: false,
                refreshStrategy: false,
            },
        },
        description: 'Research-focused content generation — 4 articles (MWF evenings)',
    },

    // ── 4. Google Search Console sync ─────────────────────────────────────
    // Runs daily at 6:30am CT (30 min before content generation).
    // Syncs the last 7 days of impressions / clicks / CTR / position and
    // recomputes the CTR-weighted cluster strategy used by the engine.
    {
        name: 'daily-gsc-sync',
        cadence: 'DAILY',
        timezone: 'America/Chicago',
        runHour: 6,
        runMinute: 30,
        maxDaily: 1,
        options: {
            jobType: 'GSC_SYNC',
            days: 7,
            refreshStrategy: true,
        },
        description: 'Daily Google Search Console metrics sync',
    },

    // ── 5. Content refresh detection ───────────────────────────────────────
    // Runs daily at 8am CT.  Scans all published articles for CTR / position
    // decline and flags them as needing a refresh in the admin dashboard.
    {
        name: 'daily-refresh-detect',
        cadence: 'DAILY',
        timezone: 'America/Chicago',
        runHour: 8,
        runMinute: 0,
        maxDaily: 1,
        options: {
            jobType: 'CONTENT_REFRESH_DETECT',
        },
        description: 'Daily content refresh detection scan',
    },

    // ── 6. SEO health snapshot ─────────────────────────────────────────────
    // Runs daily at 5am CT — before GSC sync and content generation — so
    // the SEO health gate has fresh data when deciding whether to publish.
    {
        name: 'daily-seo-health',
        cadence: 'DAILY',
        timezone: 'America/Chicago',
        runHour: 5,
        runMinute: 0,
        maxDaily: 1,
        options: {
            jobType: 'SEO_HEALTH',
        },
        description: 'Daily SEO health snapshot refresh',
    },
];

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------

async function run() {
    console.log('Setting up ContentSchedule entries...\n');

    let created = 0;
    let updated = 0;

    for (const spec of SCHEDULES) {
        const existing = await (prisma as any).contentSchedule.findFirst({
            where: { name: spec.name } as any,
        }).catch(() => null);

        const data = {
            cadence: spec.cadence,
            timezone: spec.timezone,
            runHour: spec.runHour,
            runMinute: spec.runMinute,
            maxDaily: spec.maxDaily,
            options: spec.options,
            enabled: true,
        };

        if (existing) {
            await (prisma as any).contentSchedule.update({
                where: { id: existing.id },
                data,
            });
            console.log(`  ✓ Updated : ${spec.name}`);
            updated++;
        } else {
            await (prisma as any).contentSchedule.create({
                data: { name: spec.name, ...data } as any,
            });
            console.log(`  ✓ Created : ${spec.name}`);
            created++;
        }

        console.log(`    Cadence : ${spec.cadence} at ${String(spec.runHour).padStart(2, '0')}:${String(spec.runMinute).padStart(2, '0')} ${spec.timezone}`);
        console.log(`    Max/day : ${spec.maxDaily}`);
        console.log(`    Mode    : ${(spec.options.mode as string) || (spec.options.jobType as string)}`);
        console.log('');
    }

    console.log(`Done. Created: ${created}, Updated: ${updated}`);
    console.log('');
    console.log('Next step: ensure Cloud Scheduler is calling /api/admin/content-cron');
    console.log('Run: bash scripts/deploy-cloud-scheduler.sh');
}

run()
    .catch((error) => {
        console.error('Setup failed:', error);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

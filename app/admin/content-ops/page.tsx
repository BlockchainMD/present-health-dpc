"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

type Schedule = {
    id: string;
    name: string;
    enabled: boolean;
    timezone: string;
    cadence: string;
    runHour: number;
    runMinute: number;
    lastRunAt?: string | null;
    maxDaily?: number | null;
    options?: any;
};

type Job = {
    id: string;
    status: string;
    runAt: string;
    startedAt?: string | null;
    finishedAt?: string | null;
    schedule?: { name: string } | null;
};

export default function ContentOpsPage() {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [count, setCount] = useState(20);
    const [mode, setMode] = useState<'BALANCED' | 'TREND' | 'RESEARCH'>('BALANCED');
    const [autoPublish, setAutoPublish] = useState(false);
    const [useFeedback, setUseFeedback] = useState(true);
    const [reviewType, setReviewType] = useState<'CLINICAL' | 'EDITORIAL'>('CLINICAL');
    const [reviewLabel, setReviewLabel] = useState('Present Health Clinical Team');
    const [jobType, setJobType] = useState<'CONTENT' | 'GSC_SYNC' | 'REFRESH_STRATEGY' | 'SEO_HEALTH'>('CONTENT');
    const [gscDays, setGscDays] = useState(7);
    const [refreshAfterSync, setRefreshAfterSync] = useState(true);
    const [timezone, setTimezone] = useState('America/Chicago');
    const [cadence, setCadence] = useState<'DAILY' | 'HOURLY'>('DAILY');
    const [runHour, setRunHour] = useState(8);
    const [runMinute, setRunMinute] = useState(0);
    const [maxDaily, setMaxDaily] = useState(50);
    const [scheduleName, setScheduleName] = useState('Daily Content Engine');
    const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
    const [sources, setSources] = useState({
        trends: true,
        news: true,
        pubmed: true,
        trials: true,
        nih: true,
        cdc: false,
        curated: true
    });

    const applySchedule = (schedule: Schedule) => {
        setScheduleName(schedule.name);
        setTimezone(schedule.timezone);
        setCadence(schedule.cadence as 'DAILY' | 'HOURLY');
        setRunHour(schedule.runHour);
        setRunMinute(schedule.runMinute);
        setMaxDaily(schedule.maxDaily || 50);
        const opts = schedule.options || {};
        setCount(opts.count ?? 20);
        setMode((opts.mode as any) || 'BALANCED');
        setAutoPublish(Boolean(opts.autoPublish));
        setUseFeedback(opts.useFeedback !== false);
        setReviewType((opts.reviewType as any) || 'CLINICAL');
        setReviewLabel(opts.reviewLabel || 'Present Health Clinical Team');
        setJobType((opts.jobType as any) || 'CONTENT');
        setGscDays(opts.days ?? 7);
        setRefreshAfterSync(Boolean(opts.refreshStrategy));
        if (opts.sources) setSources((prev) => ({ ...prev, ...opts.sources }));
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [scheduleRes, jobRes] = await Promise.all([
                fetch('/api/admin/content-schedules'),
                fetch('/api/admin/content-jobs')
            ]);
            const scheduleData = await scheduleRes.json();
            const jobData = await jobRes.json();
            if (scheduleData.success) {
                setSchedules(scheduleData.schedules);
                const selected = scheduleData.schedules.find((s: Schedule) => s.id === selectedScheduleId);
                if (selected) {
                    applySchedule(selected);
                } else if (!selectedScheduleId && scheduleData.schedules[0]) {
                    const first = scheduleData.schedules[0];
                    setSelectedScheduleId(first.id);
                    applySchedule(first);
                }
            }
            if (jobData.success) setJobs(jobData.jobs);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setReviewLabel((prev) => {
            if (reviewType === 'EDITORIAL' && prev === 'Present Health Clinical Team') return 'Present Health Editorial Team';
            if (reviewType === 'CLINICAL' && prev === 'Present Health Editorial Team') return 'Present Health Clinical Team';
            return prev;
        });
    }, [reviewType]);

    const createSchedule = async () => {
        setSaving(true);
        try {
            const payload = {
                name: scheduleName || 'Content Engine Schedule',
                timezone,
                cadence,
                runHour,
                runMinute,
                maxDaily,
                options: {
                    jobType,
                    count,
                    mode,
                    autoPublish,
                    useFeedback,
                    reviewType,
                    reviewLabel,
                    sources,
                    days: gscDays,
                    refreshStrategy: refreshAfterSync
                }
            };
            if (selectedScheduleId) {
                await fetch(`/api/admin/content-schedules/${selectedScheduleId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                await fetch('/api/admin/content-schedules', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }
            await fetchData();
        } finally {
            setSaving(false);
        }
    };

    const toggleSchedule = async (schedule: Schedule) => {
        await fetch(`/api/admin/content-schedules/${schedule.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: !schedule.enabled })
        });
        await fetchData();
    };

    const runScheduler = async () => {
        await fetch('/api/admin/content-cron', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobLimit: 3 })
        });
        await fetchData();
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Content Ops</h2>
                <p className="text-muted-foreground">Schedule and monitor your content engine at scale.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Schedule Builder</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Schedule</Label>
                            <select
                                value={selectedScheduleId}
                                onChange={(e) => {
                                    const id = e.target.value;
                                    setSelectedScheduleId(id);
                                    const schedule = schedules.find((s) => s.id === id);
                                    if (schedule) applySchedule(schedule);
                                }}
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">New schedule</option>
                                {schedules.map((schedule) => (
                                    <option key={schedule.id} value={schedule.id}>
                                        {schedule.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Schedule name</Label>
                            <Input value={scheduleName} onChange={(e) => setScheduleName(e.target.value)} />
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Timezone</Label>
                            <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Run Time</Label>
                            <div className="flex gap-2">
                                <Input type="number" min={0} max={23} value={runHour} onChange={(e) => setRunHour(Number(e.target.value))} />
                                <Input type="number" min={0} max={59} value={runMinute} onChange={(e) => setRunMinute(Number(e.target.value))} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Cadence</Label>
                            <select value={cadence} onChange={(e) => setCadence(e.target.value as 'DAILY' | 'HOURLY')} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                                <option value="DAILY">Daily</option>
                                <option value="HOURLY">Hourly</option>
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Job type</Label>
                            <select value={jobType} onChange={(e) => setJobType(e.target.value as any)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                                <option value="CONTENT">Content Generation</option>
                                <option value="GSC_SYNC">GSC Sync</option>
                                <option value="REFRESH_STRATEGY">Refresh Strategy</option>
                                <option value="SEO_HEALTH">SEO Health Snapshot</option>
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Daily target (per run)</Label>
                            <Input type="number" min={1} value={count} onChange={(e) => setCount(Number(e.target.value))} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Max daily cap</Label>
                            <Input type="number" min={1} value={maxDaily} onChange={(e) => setMaxDaily(Number(e.target.value))} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Mode</Label>
                            <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                                <option value="BALANCED">Balanced</option>
                                <option value="TREND">Trend</option>
                                <option value="RESEARCH">Research</option>
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Reviewer label</Label>
                            <Input value={reviewLabel} onChange={(e) => setReviewLabel(e.target.value)} />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                            <div>
                                <Label className="text-sm font-medium">Auto-publish low-risk</Label>
                                <p className="text-xs text-muted-foreground">Only LOW risk drafts auto-publish.</p>
                            </div>
                            <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                            <div>
                                <Label className="text-sm font-medium">Use performance feedback</Label>
                                <p className="text-xs text-muted-foreground">Weights topic selection by CTR.</p>
                            </div>
                            <Switch checked={useFeedback} onCheckedChange={setUseFeedback} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Review type</Label>
                            <select value={reviewType} onChange={(e) => setReviewType(e.target.value as any)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                                <option value="CLINICAL">Clinical</option>
                                <option value="EDITORIAL">Editorial</option>
                            </select>
                        </div>
                    </div>

                    {jobType === 'GSC_SYNC' && (
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>GSC lookback (days)</Label>
                                <Input type="number" min={1} value={gscDays} onChange={(e) => setGscDays(Number(e.target.value))} />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                                <div>
                                    <Label className="text-sm font-medium">Refresh strategy after sync</Label>
                                    <p className="text-xs text-muted-foreground">Update weights using new CTR data.</p>
                                </div>
                                <Switch checked={refreshAfterSync} onCheckedChange={setRefreshAfterSync} />
                            </div>
                        </div>
                    )}

                    {jobType === 'CONTENT' && (
                        <div className="grid gap-2">
                            <Label>Source mix</Label>
                            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                {([
                                    ['trends', 'Google Trends'],
                                    ['news', 'Google News'],
                                    ['pubmed', 'PubMed'],
                                    ['trials', 'ClinicalTrials.gov'],
                                    ['nih', 'NIH News'],
                                    ['cdc', 'CDC News'],
                                    ['curated', 'Curated Evergreen']
                                ] as const).map(([key, label]) => (
                                    <label key={key} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4"
                                            checked={sources[key]}
                                            onChange={(e) => setSources(prev => ({ ...prev, [key]: e.target.checked }))}
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {jobType === 'SEO_HEALTH' && (
                        <div className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
                            This schedule refreshes the SEO Health snapshot using Google Search Console data.
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button onClick={createSchedule} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : selectedScheduleId ? 'Update Schedule' : 'Create Schedule'}
                        </Button>
                        <Button variant="outline" onClick={runScheduler}>Run Scheduler Now</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Schedules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                    {!loading && schedules.length === 0 && <p className="text-sm text-muted-foreground">No schedules yet.</p>}
                    {schedules.map(schedule => (
                        <div key={schedule.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                            <div>
                                <p className="font-medium">{schedule.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {(schedule.options?.jobType || 'CONTENT')} • {schedule.cadence} • {schedule.timezone} • {schedule.runHour.toString().padStart(2, '0')}:{schedule.runMinute.toString().padStart(2, '0')} • Last run: {schedule.lastRunAt ? new Date(schedule.lastRunAt).toLocaleString() : 'Never'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => {
                                    setSelectedScheduleId(schedule.id);
                                    applySchedule(schedule);
                                }}>
                                    Edit
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => toggleSchedule(schedule)}>
                                    {schedule.enabled ? 'Disable' : 'Enable'}
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Jobs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {!loading && jobs.length === 0 && <p className="text-sm text-muted-foreground">No jobs yet.</p>}
                    {jobs.map(job => (
                        <div key={job.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                            <div>
                                <p className="font-medium">{job.schedule?.name || 'Manual job'}</p>
                                <p className="text-xs text-muted-foreground">Status: {job.status} • Run at {new Date(job.runAt).toLocaleString()}</p>
                            </div>
                            <div className="text-xs text-muted-foreground">{job.finishedAt ? `Finished ${new Date(job.finishedAt).toLocaleTimeString()}` : ''}</div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

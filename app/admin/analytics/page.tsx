"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

const defaultPayload = JSON.stringify({
    source: 'GSC',
    refreshStrategy: true,
    metrics: [
        {
            slug: 'example-article-slug',
            date: '2026-01-20',
            impressions: 1200,
            clicks: 72,
            position: 9.4
        }
    ]
}, null, 2);

export default function AnalyticsPage() {
    const [payload, setPayload] = useState(defaultPayload);
    const [result, setResult] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [gscDays, setGscDays] = useState(7);

    const ingest = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/metrics/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload
            });
            const data = await res.json();
            setResult(JSON.stringify(data, null, 2));
        } finally {
            setLoading(false);
        }
    };

    const refreshStrategy = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/metrics/refresh-strategy', { method: 'POST' });
            const data = await res.json();
            setResult(JSON.stringify(data, null, 2));
        } finally {
            setLoading(false);
        }
    };

    const syncGsc = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/metrics/gsc-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ days: gscDays })
            });
            const data = await res.json();
            setResult(JSON.stringify(data, null, 2));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Analytics & Feedback</h2>
                <p className="text-muted-foreground">Ingest CTR data and refresh performance weights.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Ingest Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea value={payload} onChange={(e) => setPayload(e.target.value)} className="min-h-[240px] font-mono text-xs" />
                    <div className="flex gap-3 items-center">
                        <Button onClick={ingest} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Metrics'}
                        </Button>
                        <Button variant="outline" onClick={refreshStrategy} disabled={loading}>
                            Refresh Strategy
                        </Button>
                        <input
                            type="number"
                            min={1}
                            className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm"
                            value={gscDays}
                            onChange={(e) => setGscDays(Number(e.target.value))}
                        />
                        <Button variant="outline" onClick={syncGsc} disabled={loading}>
                            Sync GSC (days)
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle>Response</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="text-xs whitespace-pre-wrap break-words bg-muted/30 p-3 rounded-lg">{result}</pre>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/authz';
import { buildSeoHealthReportCsv, getSeoHealthSnapshot } from '@/lib/seo-health/service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const searchParams = new URL(request.url).searchParams;
        const refresh = searchParams.get('refresh') === '1';
        const format = (searchParams.get('format') || '').trim().toLowerCase();
        const snapshot = await getSeoHealthSnapshot({ refresh, refreshIfStale: true });

        if (format === 'csv') {
            const csv = buildSeoHealthReportCsv(snapshot.report);
            return new Response(csv, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename=\"seo-health-${new Date(snapshot.updatedAt).toISOString().slice(0, 10)}.csv\"`,
                },
            });
        }

        if (format === 'json') {
            return new Response(JSON.stringify({
                report: snapshot.report,
                meta: {
                    updatedAt: snapshot.updatedAt,
                    cached: snapshot.cached,
                    stale: snapshot.stale,
                    config: snapshot.config,
                    trend: snapshot.report.trend,
                },
            }, null, 2), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Content-Disposition': `attachment; filename=\"seo-health-${new Date(snapshot.updatedAt).toISOString().slice(0, 10)}.json\"`,
                },
            });
        }

        return NextResponse.json({
            success: true,
            report: snapshot.report,
            meta: {
                updatedAt: snapshot.updatedAt,
                cached: snapshot.cached,
                stale: snapshot.stale,
                config: snapshot.config,
                trend: snapshot.report.trend,
            }
        });
    } catch (error: any) {
        console.error('SEO health error:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to fetch SEO health' },
            { status: 500 }
        );
    }
}

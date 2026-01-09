import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateMockMetrics } from '@/lib/ads/metrics';
import { syncMetricsFromGoogleAds } from '@/lib/ads/google-ads';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // Find the deployed or latest run for this campaign
        const campaign = await prisma.campaign.findUnique({
            where: { id },
            include: {
                runs: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        if (!campaign || campaign.runs.length === 0) {
            return NextResponse.json({ error: 'Campaign not found or has no runs' }, { status: 404 });
        }

        const run = campaign.runs[0];
        const runId = run.id;

        // Attempt live sync if deployed
        if (run.status === 'DEPLOYED' || run.status === 'ACTIVE') {
            try {
                await syncMetricsFromGoogleAds(runId);
            } catch (err) {
                console.error("[MetricsAPI] Live sync failed, showing existing/mock data:", err);
            }
        }

        // Fetch metrics
        let metrics = await prisma.campaignMetric.findMany({
            where: { campaignRunId: runId },
            orderBy: { date: 'asc' }
        });

        // If no metrics exist, mock them for demo purposes
        if (metrics.length === 0) {
            await generateMockMetrics(runId, 30);
            metrics = await prisma.campaignMetric.findMany({
                where: { campaignRunId: runId },
                orderBy: { date: 'asc' }
            });
        }

        return NextResponse.json(metrics);
    } catch (error) {
        console.error('Error fetching metrics:', error);
        return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    // Regenerate mock data action
    try {
        const { id } = await params;
        const campaign = await prisma.campaign.findUnique({
            where: { id },
            include: { runs: { orderBy: { createdAt: 'desc' }, take: 1 } }
        });

        if (!campaign || campaign.runs.length === 0) {
            return NextResponse.json({ error: 'No run found' }, { status: 404 });
        }

        await generateMockMetrics(campaign.runs[0].id, 30);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to regenerate metrics' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = params;

    try {
        const campaign = await prisma.campaign.findUnique({
            where: { id },
            include: {
                runs: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: {
                        _count: {
                            select: { leads: true }
                        }
                    }
                }
            }
        });

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        // Fetch GeneratedAssets for the latest run
        let assets: any[] = [];
        if (campaign.runs[0]) {
            assets = await prisma.generatedAsset.findMany({
                where: { campaignRunId: campaign.runs[0].id },
                select: {
                    id: true,
                    type: true,
                    status: true,
                    approvedAt: true,
                    approvedByUserId: true
                }
            });
        }

        return NextResponse.json({ ...campaign, assets });
    } catch (error) {
        console.error('Error fetching campaign:', error);
        return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = params;

    try {
        await prisma.campaign.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting campaign:', error);
        return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
    }
}

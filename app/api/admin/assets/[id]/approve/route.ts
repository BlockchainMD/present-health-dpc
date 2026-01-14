import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';
import { NextResponse } from 'next/server';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await requireAdmin();
    const { id } = await params;

    try {
        // 2. Find Assistant
        const asset = await prisma.generatedAsset.findUnique({
            where: { id }
        });

        if (!asset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        if (asset.status === 'APPROVED') {
            return NextResponse.json({ message: 'Asset already approved' });
        }

        // 3. Update Asset Status
        const updatedAsset = await prisma.generatedAsset.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedAt: new Date(),
                approvedByUserId: session.user.id
            }
        });

        // 4. Record Audit Log
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                action: 'APPROVE_ASSET',
                entityType: 'GeneratedAsset',
                entityId: asset.id,
                metadata: {
                    type: asset.type,
                    campaignRunId: asset.campaignRunId
                }
            }
        });

        return NextResponse.json(updatedAsset);
    } catch (error: any) {
        console.error('[ApproveAsset] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

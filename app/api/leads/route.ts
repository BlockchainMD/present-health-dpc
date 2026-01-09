import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { runId, gclid, email, metadata } = body;

        if (!runId) {
            return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
        }

        // Create or Update Lead
        // If email is provided, we try to find an existing lead for this run
        let lead;
        if (email) {
            lead = await prisma.lead.findFirst({
                where: {
                    campaignRunId: runId,
                    email: email
                }
            });
        }

        if (lead) {
            lead = await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    gclid: gclid || lead.gclid,
                    metadata: { ...(lead.metadata as any || {}), ...(metadata || {}) },
                    updatedAt: new Date()
                }
            });
        } else {
            lead = await prisma.lead.create({
                data: {
                    campaignRunId: runId,
                    gclid,
                    email,
                    metadata: metadata || {},
                    status: 'PENDING'
                }
            });
        }

        return NextResponse.json({ success: true, leadId: lead.id });
    } catch (error: any) {
        console.error('[LeadsAPI] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

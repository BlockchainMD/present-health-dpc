import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateAttributionSession, linkAttributionSessionToLead } from '@/lib/attribution';
import { recordConversionEvent } from '@/lib/conversion';

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        const { runId, gclid, email, metadata } = body as any;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : undefined;
        const safeMetadata = metadata && typeof metadata === 'object' ? metadata : {};

        if (!runId) {
            return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
        }
        const runExists = await prisma.campaignRun.findUnique({ where: { id: runId }, select: { id: true } });
        if (!runExists) {
            return NextResponse.json({ error: 'Invalid runId' }, { status: 404 });
        }

        // Create or Update Lead
        // If email is provided, we try to find an existing lead for this run
        let lead;
        if (normalizedEmail) {
            lead = await prisma.lead.findFirst({
                where: {
                    campaignRunId: runId,
                    email: normalizedEmail
                }
            });
        }

        if (lead) {
            lead = await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    gclid: gclid || lead.gclid,
                    metadata: { ...(lead.metadata as any || {}), ...safeMetadata },
                    updatedAt: new Date()
                }
            });
        } else {
            lead = await prisma.lead.create({
                data: {
                    campaignRunId: runId,
                    gclid,
                    email: normalizedEmail,
                    metadata: safeMetadata,
                    status: 'PENDING'
                }
            });
        }

        // Attribution Handling
        const sessionId = await getOrCreateAttributionSession(request);
        if (sessionId && lead) {
            await linkAttributionSessionToLead(sessionId, lead.id);
        }

        // Record Conversion Event
        if (lead) {
            console.log(`[LeadsAPI] Created/Updated lead: ${lead.id}`, {
                email: email ? '[REDACTED]' : null,
                runId: runId,
                sessionId: sessionId
            });

            await recordConversionEvent({
                type: 'LEAD_CREATED',
                attributionSessionId: sessionId,
                leadId: lead.id,
                metadata: { ...safeMetadata, source: 'LeadsAPI' }
            });
        }

        return NextResponse.json({ success: true, leadId: lead?.id });
    } catch (error: any) {
        console.error('[LeadsAPI] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

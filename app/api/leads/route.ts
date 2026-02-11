import { NextResponse, NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getOrCreateAttributionSession, linkAttributionSessionToLead } from '@/lib/attribution';
import { recordConversionEvent } from '@/lib/conversion';
import { upsertUnifiedLeadFromCampaignLead } from '@/lib/unified-leads';
import { queueAutoResponseFromCampaignLead } from '@/lib/auto-response';

function pickStringValue(obj: unknown, keys: string[]) {
    if (!obj || typeof obj !== 'object') return '';
    const source = obj as Record<string, unknown>;
    for (const key of keys) {
        const value = source[key];
        if (typeof value !== 'string') continue;
        const trimmed = value.trim();
        if (trimmed) return trimmed;
    }
    return '';
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        const payload = body as Record<string, unknown>;
        const runId = typeof payload.runId === 'string' ? payload.runId.trim() : '';
        const gclid = typeof payload.gclid === 'string' ? payload.gclid.trim() : undefined;
        const email = typeof payload.email === 'string' ? payload.email.trim() : undefined;
        const metadataRaw = payload.metadata;
        const safeMetadataObject =
            metadataRaw && typeof metadataRaw === 'object' && !Array.isArray(metadataRaw)
                ? (metadataRaw as Record<string, unknown>)
                : {};
        const safeMetadataJson = safeMetadataObject as Prisma.InputJsonValue;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : undefined;

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
                    metadata: {
                        ...((lead.metadata && typeof lead.metadata === 'object'
                            ? (lead.metadata as Record<string, unknown>)
                            : {}) as Record<string, unknown>),
                        ...safeMetadataObject,
                    } as Prisma.InputJsonValue,
                    updatedAt: new Date()
                }
            });
        } else {
            lead = await prisma.lead.create({
                data: {
                    campaignRunId: runId,
                    gclid,
                    email: normalizedEmail,
                    metadata: safeMetadataJson,
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
                metadata: { ...safeMetadataObject, source: 'LeadsAPI' } as Prisma.InputJsonValue
            });

            try {
                const hydratedLead = await prisma.lead.findUnique({
                    where: { id: lead.id },
                    include: {
                        campaignRun: {
                            select: {
                                campaign: {
                                    select: { landingSlug: true },
                                },
                            },
                        },
                    },
                });
                if (hydratedLead) {
                    void upsertUnifiedLeadFromCampaignLead(hydratedLead, true).catch((syncError) => {
                        console.error('[LeadsAPI] Failed to sync unified lead', syncError);
                    });

                    const firstName =
                        pickStringValue(safeMetadataObject, ['firstName', 'first_name']) ||
                        pickStringValue(safeMetadataObject, ['name']).split(' ')[0] ||
                        '';
                    const state =
                        pickStringValue(safeMetadataObject, ['state', 'stateName', 'state_name', 'residentState']) || '';
                    const landingSlug = hydratedLead.campaignRun?.campaign?.landingSlug || '';
                    const sourcePage = landingSlug ? `/lp/${landingSlug}` : '';

                    void queueAutoResponseFromCampaignLead(hydratedLead, {
                        firstName,
                        state,
                        sourcePage,
                    }).catch((autoResponseError) => {
                        console.error('[LeadsAPI] Failed to queue auto-response', autoResponseError);
                    });
                }
            } catch (syncLoadError) {
                console.error('[LeadsAPI] Failed to load lead for unified sync', syncLoadError);
            }
        }

        return NextResponse.json({ success: true, leadId: lead?.id });
    } catch (error) {
        console.error('[LeadsAPI] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadConversionToGoogleAds } from '@/lib/ads/google-ads';
import { recordConversionEvent } from '@/lib/conversion';
import { upsertUnifiedLeadFromCalBooking, upsertUnifiedLeadFromCampaignLead } from '@/lib/unified-leads';

export async function POST(request: NextRequest) {
    try {
        const authorized = await verifyWebhookAuth(request);
        if (!authorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const payload = await request.json().catch(() => null);
        if (!payload || typeof payload !== 'object') {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        console.log('[CalWebhook] Received:', JSON.stringify(payload, null, 2));

        // Extract email from Cal.com payload
        // Structure varies by event, but usually it's in payload.attendees or payload.order
        const attendee = payload.payload?.attendees?.[0] || payload.attendees?.[0];
        const emailRaw = attendee?.email || payload.payload?.email || payload.email;
        const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : undefined;
        const fullNameRaw =
            attendee?.name ||
            payload.payload?.name ||
            payload.name ||
            payload.payload?.attendeeName ||
            payload.attendeeName ||
            '';
        const fullName = typeof fullNameRaw === "string" ? fullNameRaw.trim() : "";
        const sourceRecordIdRaw =
            payload.payload?.uid ||
            payload.uid ||
            payload.payload?.bookingId ||
            payload.bookingId ||
            payload.payload?.id ||
            payload.id ||
            email ||
            "";
        const sourceRecordId = String(sourceRecordIdRaw).trim() || (email || `cal-${Date.now()}`);
        const bookingTimeRaw =
            payload.payload?.startTime ||
            payload.startTime ||
            payload.payload?.start ||
            payload.start ||
            null;
        const bookingTime =
            typeof bookingTimeRaw === "string" && Number.isFinite(new Date(bookingTimeRaw).getTime())
                ? new Date(bookingTimeRaw)
                : new Date();

        if (!email) {
            console.warn('[CalWebhook] No email found in payload');
            return NextResponse.json({ received: true, error: 'No email found' });
        }

        // Find the PENDING lead for this email
        const lead = await prisma.lead.findFirst({
            where: {
                email: email,
                status: 'PENDING'
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!lead) {
            console.log(`[CalWebhook] No pending lead found for ${email}. Might be a direct booking.`);
            await upsertUnifiedLeadFromCalBooking(
                {
                    sourceRecordId,
                    email,
                    fullName,
                    sourcePage: "/join",
                    sourceMeta: payload,
                    createdAt: bookingTime,
                },
                true
            );

            await recordConversionEvent({
                type: "CONSULTATION_BOOKED",
                metadata: { source: "CalWebhook", payload, leadType: "direct" },
            });

            return NextResponse.json({ received: true, message: 'No pending lead; unified lead captured' });
        }

        // Update lead status
        const updatedLead = await prisma.lead.update({
            where: { id: lead.id },
            data: {
                status: 'BOOKED',
                convertedAt: new Date(),
                email: email // In case we didn't have it before
            },
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

        console.log(`[CalWebhook] Lead converted: ${email} (Lead ID: ${lead.id})`);

        await upsertUnifiedLeadFromCampaignLead(updatedLead, false);

        // Record Conversion Event
        const session = await prisma.attributionSession.findFirst({
            where: { leadId: lead.id },
            orderBy: { createdAt: 'desc' }
        });

        await recordConversionEvent({
            type: 'CONSULTATION_BOOKED',
            attributionSessionId: session?.id,
            leadId: lead.id,
            metadata: { source: 'CalWebhook', payload }
        });

        // Trigger Google Ads conversion if we have a gclid
        if (lead.gclid) {
            console.log(`[CalWebhook] Triggering Google Ads upload for GCLID: ${lead.gclid}`);
            // We run this asyncly and don't await/block the webhook response
            uploadConversionToGoogleAds(lead.gclid, new Date())
                .catch(err => console.error('[CalWebhook] GAds Upload Error:', err));
        }

        return NextResponse.json({ received: true, leadId: lead.id });

    } catch (error: any) {
        console.error('[CalWebhook] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function verifyWebhookAuth(request: NextRequest) {
    const secret = process.env.CAL_WEBHOOK_SECRET;
    if (!secret) return true;
    const header = request.headers.get('x-webhook-secret');
    const bearer = request.headers.get('authorization')?.replace('Bearer ', '');
    return header === secret || bearer === secret;
}

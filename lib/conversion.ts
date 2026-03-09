import { prisma } from './prisma';
import { sendGA4ServerEvent } from './ga4-measurement';

export interface ConversionEventParams {
    type: string;
    attributionSessionId?: string | null;
    leadId?: string | null;
    userId?: string | null;
    metadata?: any;
}

/**
 * Record a conversion event in the append-only ConversionEvent log.
 */
export async function recordConversionEvent(params: ConversionEventParams) {
    try {
        const event = await prisma.conversionEvent.create({
            data: {
                type: params.type,
                attributionSessionId: params.attributionSessionId,
                leadId: params.leadId,
                userId: params.userId,
                metadata: params.metadata || {},
            },
        });

        console.log(`[Conversion] Recorded ${params.type}`, {
            id: event.id,
            attributionSessionId: params.attributionSessionId,
            leadId: params.leadId,
            userId: params.userId
        });

        // Forward to GA4 via Measurement Protocol (fire-and-forget)
        sendGA4ServerEvent(params.type, {
            leadId: params.leadId,
            userId: params.userId,
            sessionId: params.attributionSessionId,
        });

        return event;
    } catch (error) {
        console.error(`[recordConversionEvent] Failed to record ${params.type}:`, error);
        // Don't throw, we don't want to break the main flow for logging
        return null;
    }
}

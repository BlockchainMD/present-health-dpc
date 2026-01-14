import { prisma } from './prisma';

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

        return event;
    } catch (error) {
        console.error(`[recordConversionEvent] Failed to record ${params.type}:`, error);
        // Don't throw, we don't want to break the main flow for logging
        return null;
    }
}

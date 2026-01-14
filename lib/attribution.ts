import { cookies } from 'next/headers';
import { prisma } from './prisma';
import crypto from 'crypto';

export interface AttributionData {
    gclid?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    landingPath: string;
    referrer?: string;
    userAgentHash?: string;
    ipHash?: string;
}

const ATTRIBUION_COOKIE_NAME = 'ph_attrib';
const COOKIE_DURATION_DAYS = 30;

function hashString(str: string): string {
    return crypto.createHash('sha256').update(str).digest('hex').slice(0, 32);
}

export async function extractAttributionFromRequest(req: Request): Promise<AttributionData> {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const userAgent = req.headers.get('user-agent') || '';
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';

    return {
        gclid: searchParams.get('gclid') || undefined,
        utmSource: searchParams.get('utm_source') || undefined,
        utmMedium: searchParams.get('utm_medium') || undefined,
        utmCampaign: searchParams.get('utm_campaign') || undefined,
        utmTerm: searchParams.get('utm_term') || undefined,
        utmContent: searchParams.get('utm_content') || undefined,
        landingPath: url.pathname,
        referrer: req.headers.get('referer') || undefined,
        userAgentHash: userAgent ? hashString(userAgent) : undefined,
        ipHash: ip ? hashString(ip) : undefined,
    };
}

export async function getOrCreateAttributionSession(req?: Request, dataOverride?: Partial<AttributionData>): Promise<string | null> {
    const cookieStore = await cookies();
    const existingSessionId = cookieStore.get(ATTRIBUION_COOKIE_NAME)?.value;

    let data: AttributionData;
    if (req) {
        data = await extractAttributionFromRequest(req);
    } else if (dataOverride) {
        data = {
            landingPath: '/',
            ...dataOverride
        } as AttributionData;
    } else {
        return existingSessionId || null;
    }

    const hasParams = !!(data.gclid || data.utmSource || data.utmMedium || data.utmCampaign);

    if (hasParams) {
        // Create new session if parameters are present (even if cookie exists, parameters take precedence for a new session)
        const session = await prisma.attributionSession.create({
            data: {
                gclid: data.gclid,
                utmSource: data.utmSource,
                utmMedium: data.utmMedium,
                utmCampaign: data.utmCampaign,
                utmTerm: data.utmTerm,
                utmContent: data.utmContent,
                landingPath: data.landingPath,
                referrer: data.referrer,
                userAgentHash: data.userAgentHash ? (req ? hashString(data.userAgentHash) : data.userAgentHash) : undefined,
                ipHash: data.ipHash ? (req ? hashString(data.ipHash) : data.ipHash) : undefined,
            }
        });

        console.log(`[Attribution] Created parameter-based session: ${session.id}`, {
            gclid: data.gclid,
            utmSource: data.utmSource,
            landingPath: data.landingPath
        });

        cookieStore.set(ATTRIBUION_COOKIE_NAME, session.id, {
            maxAge: 60 * 60 * 24 * COOKIE_DURATION_DAYS,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });

        return session.id;
    }

    if (existingSessionId) {
        return existingSessionId;
    }

    // Baseline attribution if neither exists
    const session = await prisma.attributionSession.create({
        data: {
            landingPath: data.landingPath,
            referrer: data.referrer,
            userAgentHash: data.userAgentHash ? (req ? hashString(data.userAgentHash) : data.userAgentHash) : undefined,
            ipHash: data.ipHash ? (req ? hashString(data.ipHash) : data.ipHash) : undefined,
        }
    });

    console.log(`[Attribution] Created baseline session: ${session.id}`, {
        landingPath: data.landingPath,
        referrer: data.referrer
    });

    cookieStore.set(ATTRIBUION_COOKIE_NAME, session.id, {
        maxAge: 60 * 60 * 24 * COOKIE_DURATION_DAYS,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });

    return session.id;
}

export async function linkAttributionSessionToLead(sessionId: string, leadId: string) {
    await prisma.attributionSession.update({
        where: { id: sessionId },
        data: { leadId }
    });
}


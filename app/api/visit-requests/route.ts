import { AutoResponseSource } from "@prisma/client";
import { NextResponse } from "next/server";

import { enqueueAutoResponse } from "@/lib/auto-response";
import { getOrCreateAttributionSession } from "@/lib/attribution";
import { recordConversionEvent } from "@/lib/conversion";
import { resolveServedState } from "@/lib/state-availability";
import { upsertUnifiedLeadFromWebsiteRegistration } from "@/lib/unified-leads";

function cleanString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
        }

        const firstName = cleanString((body as Record<string, unknown>).firstName);
        const lastName = cleanString((body as Record<string, unknown>).lastName);
        const email = cleanString((body as Record<string, unknown>).email).toLowerCase();
        const phone = cleanString((body as Record<string, unknown>).phone);
        const stateRaw = cleanString((body as Record<string, unknown>).state);
        const concern = cleanString((body as Record<string, unknown>).concern);

        if (!firstName || !lastName || !email || !stateRaw || !concern) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        const servedState = await resolveServedState(stateRaw);
        if (!servedState) {
            return NextResponse.json(
                {
                    message:
                        "Present Health is not yet available in your state. Join the state waitlist and we will notify you when access opens.",
                },
                { status: 400 }
            );
        }

        const attributionSessionId = await getOrCreateAttributionSession(req);
        const sourceRecordId = `register:${email}`;

        const result = await upsertUnifiedLeadFromWebsiteRegistration(
            {
                sourceRecordId,
                email,
                firstName,
                lastName,
                phone: phone || null,
                state: servedState.name,
                sourcePage: "/visit",
                sourceMeta: {
                    offer: "single_visit",
                    concern,
                    stateRequested: stateRaw,
                },
            },
            true
        );

        await enqueueAutoResponse({
            source: AutoResponseSource.GENERAL_CONTACT,
            leadRefType: "SingleVisitRequest",
            leadRefId: result.leadId || sourceRecordId,
            email,
            firstName,
            state: servedState.name,
            sourcePage: "/visit",
        });

        await recordConversionEvent({
            type: "SINGLE_VISIT_REQUESTED",
            attributionSessionId,
            leadId: result.leadId || null,
            metadata: {
                source: "VisitRequestAPI",
                offer: "single_visit",
                state: servedState.name,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Thanks. Your single-visit request was received and the team will follow up by email.",
        });
    } catch (error) {
        console.error("[VisitRequestsAPI] Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { UnifiedLeadMembershipTier } from "@prisma/client";
import { getOrCreateAttributionSession } from "@/lib/attribution";
import { recordConversionEvent } from "@/lib/conversion";
import { normalizeCoverageType } from "@/lib/pricing";
import { resolveServedState } from "@/lib/state-availability";
import { upsertUnifiedLeadFromCampaignLead, upsertUnifiedLeadFromWebsiteRegistration } from "@/lib/unified-leads";

function mapPlanToTier(plan: "individual" | "couple" | "family") {
    if (plan === "couple") return UnifiedLeadMembershipTier.INDIVIDUAL;
    if (plan === "family") return UnifiedLeadMembershipTier.INDIVIDUAL;
    return UnifiedLeadMembershipTier.INDIVIDUAL;
}

function mapTierToMonthlyRate(tier: UnifiedLeadMembershipTier) {
    if (tier === UnifiedLeadMembershipTier.COUPLE) return 49;
    if (tier === UnifiedLeadMembershipTier.FAMILY) return 49;
    return 49;
}

export async function POST(req: Request) {
    try {
        console.log("Register API called");
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return NextResponse.json(
                { message: "Invalid JSON body" },
                { status: 400 }
            );
        }
        console.log("Request body parsed:", { ...body, password: "***" });
        const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
        const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
        const emailRaw = typeof body.email === 'string' ? body.email.trim() : '';
        const email = emailRaw.toLowerCase();
        const phone = typeof body.phone === 'string' ? body.phone.trim() : null;
        const password = typeof body.password === 'string' ? body.password : '';
        const stateRaw = typeof body.state === "string" ? body.state.trim() : "";
        const plan = normalizeCoverageType(body.plan);
        const membershipTier = mapPlanToTier(plan);
        const monthlyMembershipRate = mapTierToMonthlyRate(membershipTier);

        if (!firstName || !lastName || !email || !password || !stateRaw) {
            console.log("Missing fields");
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        const servedState = await resolveServedState(stateRaw);
        if (!servedState) {
            return NextResponse.json(
                {
                    message:
                        "Present Health is not yet available in your state. Join the waitlist and we will notify you when access opens.",
                },
                { status: 400 }
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            console.log("User already exists");
            return NextResponse.json(
                { message: "User already exists" },
                { status: 409 }
            );
        }

        console.log("Hashing password...");
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log("Checking for existing lead...");
        const campaignLead = await prisma.lead.findFirst({
            where: { email },
            orderBy: { createdAt: "desc" },
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

        const sessionId = await getOrCreateAttributionSession(req);

        const unifiedLeadResult = campaignLead
            ? await (async () => {
                const mergedMetadata =
                    campaignLead.metadata && typeof campaignLead.metadata === "object" && !Array.isArray(campaignLead.metadata)
                        ? {
                            ...(campaignLead.metadata as Record<string, unknown>),
                            firstName,
                            lastName,
                            state: servedState.name,
                            plan,
                            sourcePage: "/register",
                        }
                        : {
                            firstName,
                            lastName,
                            state: servedState.name,
                            plan,
                            sourcePage: "/register",
                        };

                const updatedCampaignLead = await prisma.lead.update({
                    where: { id: campaignLead.id },
                    data: {
                        metadata: mergedMetadata,
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

                return upsertUnifiedLeadFromCampaignLead(updatedCampaignLead, true);
            })()
            : await upsertUnifiedLeadFromWebsiteRegistration(
                {
                    email,
                    firstName,
                    lastName,
                    phone,
                    state: servedState.name,
                    sourcePage: "/register",
                    sourceRecordId: `register:${email}`,
                    membershipTier,
                    monthlyMembershipRate,
                },
                true
            );

        console.log("Creating user in DB...");
        const user = await prisma.user.create({
            data: {
                name: `${firstName} ${lastName}`,
                email,
                password: hashedPassword,
                leadId: campaignLead?.id,
                attributionSessionId: sessionId,
            },
        });
        console.log("User created:", user.id);

        const unifiedLeadId = "leadId" in unifiedLeadResult ? unifiedLeadResult.leadId : null;

        // Record Conversion Event
        await recordConversionEvent({
            type: 'REGISTERED',
            attributionSessionId: sessionId,
            userId: user.id,
            leadId: campaignLead?.id,
            metadata: {
                source: "RegisterAPI",
                leadId: campaignLead?.id,
                unifiedLeadId,
                state: servedState.name,
                plan,
            },
        });

        return NextResponse.json(
            { message: "User created successfully", userId: user.id },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error details:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}

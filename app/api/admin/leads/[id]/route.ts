import { NextRequest, NextResponse } from "next/server";
import { UnifiedLeadMembershipTier, UnifiedLeadStatus } from "@prisma/client";

import { requireAdmin } from "@/lib/authz";
import { getUnifiedLeadDetail, updateUnifiedLead, updateUnifiedLeadStatus } from "@/lib/unified-leads";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

function parseTier(value: unknown) {
    const raw = String(value || "").trim().toUpperCase();
    if (!raw) return null;
    return Object.values(UnifiedLeadMembershipTier).includes(raw as UnifiedLeadMembershipTier)
        ? (raw as UnifiedLeadMembershipTier)
        : null;
}

export async function GET(_request: NextRequest, { params }: { params: Params }) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const lead = await getUnifiedLeadDetail(id);
        if (!lead) {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, lead });
    } catch (error) {
        console.error("[AdminUnifiedLeadAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load lead detail" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
    let session;
    try {
        session = await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = ((session as any)?.user?.id as string | undefined) || null;

    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
        }
        const payload = body as Record<string, unknown>;
        const monthlyMembershipRate =
            typeof payload.monthlyMembershipRate === "number"
                ? payload.monthlyMembershipRate
                : typeof payload.monthlyMembershipRate === "string" && payload.monthlyMembershipRate.trim()
                    ? Number(payload.monthlyMembershipRate)
                    : payload.monthlyMembershipRate === null
                        ? null
                        : undefined;

        const statusRaw = String(payload.status || "").trim().toUpperCase();
        if (statusRaw) {
            if (!Object.values(UnifiedLeadStatus).includes(statusRaw as UnifiedLeadStatus)) {
                return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
            }

            await updateUnifiedLeadStatus(id, statusRaw as UnifiedLeadStatus, {
                updatedByUserId: userId,
                note: typeof payload.statusNote === "string" ? payload.statusNote : null,
            });
        }

        const hasFieldPatch =
            "firstName" in payload ||
            "lastName" in payload ||
            "email" in payload ||
            "phone" in payload ||
            "state" in payload ||
            "sourcePage" in payload ||
            "notes" in payload ||
            "membershipTier" in payload ||
            "monthlyMembershipRate" in payload ||
            "assignedPhysicianId" in payload;

        if (hasFieldPatch) {
            const membershipTier = parseTier(payload.membershipTier);
            if (payload.membershipTier !== undefined && payload.membershipTier !== null && !membershipTier) {
                return NextResponse.json({ success: false, error: "Invalid membership tier" }, { status: 400 });
            }

            await updateUnifiedLead(
                id,
                {
                    firstName: typeof payload.firstName === "string" ? payload.firstName : undefined,
                    lastName: typeof payload.lastName === "string" ? payload.lastName : undefined,
                    email: typeof payload.email === "string" ? payload.email : undefined,
                    phone: typeof payload.phone === "string" || payload.phone === null ? (payload.phone as string | null) : undefined,
                    state: typeof payload.state === "string" || payload.state === null ? (payload.state as string | null) : undefined,
                    sourcePage:
                        typeof payload.sourcePage === "string" || payload.sourcePage === null
                            ? (payload.sourcePage as string | null)
                            : undefined,
                    notes: typeof payload.notes === "string" || payload.notes === null ? (payload.notes as string | null) : undefined,
                    membershipTier: payload.membershipTier !== undefined ? membershipTier : undefined,
                    monthlyMembershipRate,
                    assignedPhysicianId:
                        typeof payload.assignedPhysicianId === "string" || payload.assignedPhysicianId === null
                            ? (payload.assignedPhysicianId as string | null)
                            : undefined,
                },
                { updatedByUserId: userId }
            );
        }

        const lead = await getUnifiedLeadDetail(id);
        if (!lead) {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, lead });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to update lead" },
            { status: 400 }
        );
    }
}

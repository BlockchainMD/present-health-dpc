import { NextRequest, NextResponse } from "next/server";
import { UnifiedLeadMembershipTier, UnifiedLeadStatus } from "@prisma/client";

import { requireAdmin } from "@/lib/authz";
import {
    createManualUnifiedLead,
    getLeadFilterOptions,
    getLeadFollowUpCount,
    getUnifiedLeadList,
    parseUnifiedLeadFilters,
    syncUnifiedLeadsFromSources,
} from "@/lib/unified-leads";

export const runtime = "nodejs";

function clampInt(value: unknown, fallback: number, min: number, max: number) {
    const n = typeof value === "string" ? Number.parseInt(value, 10) : typeof value === "number" ? value : NaN;
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.trunc(n)));
}

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters = parseUnifiedLeadFilters(searchParams);
    const page = clampInt(searchParams.get("page"), 1, 1, 5000);
    const pageSize = clampInt(searchParams.get("pageSize"), 100, 10, 250);
    const sync = searchParams.get("sync") !== "0";

    try {
        const syncResult = sync
            ? await syncUnifiedLeadsFromSources({ sendNotifications: true, limitPerSource: 2000 })
            : null;

        const [list, filterOptions, staleCount] = await Promise.all([
            getUnifiedLeadList({
                ...filters,
                page,
                pageSize,
            }),
            getLeadFilterOptions(),
            getLeadFollowUpCount(),
        ]);

        return NextResponse.json({
            success: true,
            leads: list.rows,
            page: list.page,
            pageSize: list.pageSize,
            total: list.total,
            filters: {
                ...filters,
                dateFrom: filters.dateFrom ? filters.dateFrom.toISOString().slice(0, 10) : "",
                dateTo: filters.dateTo ? filters.dateTo.toISOString().slice(0, 10) : "",
            },
            options: filterOptions,
            staleCount,
            syncResult,
        });
    } catch (error) {
        console.error("[AdminUnifiedLeadsAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch unified leads" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    let session;
    try {
        session = await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
        }

        const payload = body as Record<string, unknown>;
        const action = String(payload.action || "SYNC").trim().toUpperCase();

        if (action === "SYNC") {
            const result = await syncUnifiedLeadsFromSources({
                sendNotifications: true,
                limitPerSource: 5000,
            });
            return NextResponse.json({ success: true, result });
        }

        if (action === "CREATE_MANUAL") {
            const statusRaw = String(payload.status || "NEW").trim().toUpperCase();
            if (!Object.values(UnifiedLeadStatus).includes(statusRaw as UnifiedLeadStatus)) {
                return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
            }

            const tierRaw = String(payload.membershipTier || "").trim().toUpperCase();
            const membershipTier =
                tierRaw && Object.values(UnifiedLeadMembershipTier).includes(tierRaw as UnifiedLeadMembershipTier)
                    ? (tierRaw as UnifiedLeadMembershipTier)
                    : null;

            const lead = await createManualUnifiedLead(
                {
                    firstName: typeof payload.firstName === "string" ? payload.firstName : null,
                    lastName: typeof payload.lastName === "string" ? payload.lastName : null,
                    email: typeof payload.email === "string" ? payload.email : "",
                    phone: typeof payload.phone === "string" ? payload.phone : null,
                    state: typeof payload.state === "string" ? payload.state : null,
                    sourcePage: typeof payload.sourcePage === "string" ? payload.sourcePage : null,
                    status: statusRaw as UnifiedLeadStatus,
                    notes: typeof payload.notes === "string" ? payload.notes : null,
                    membershipTier,
                    monthlyMembershipRate:
                        typeof payload.monthlyMembershipRate === "number" || typeof payload.monthlyMembershipRate === "string"
                            ? Number(payload.monthlyMembershipRate)
                            : null,
                    assignedPhysicianId:
                        typeof payload.assignedPhysicianId === "string" ? payload.assignedPhysicianId : null,
                },
                {
                    createdByUserId: ((session as any)?.user?.id as string | undefined) || null,
                    sendNotification: true,
                }
            );

            return NextResponse.json({ success: true, lead });
        }

        return NextResponse.json({ success: false, error: "Unsupported action" }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to create/update unified lead" },
            { status: 400 }
        );
    }
}


import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import {
    deleteAiOverviewObservation,
    updateAiOverviewObservation,
} from "@/lib/analytics-dashboard";

export const runtime = "nodejs";

type Params = {
    params: Promise<{ id: string }>;
};

async function assertAdmin() {
    try {
        await requireAdmin();
        return true;
    } catch {
        return false;
    }
}

export async function PATCH(request: NextRequest, { params }: Params) {
    const authorized = await assertAdmin();
    if (!authorized) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
        }

        const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        if (!payload || typeof payload !== "object") {
            return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
        }

        const observation = await updateAiOverviewObservation(id, payload);
        return NextResponse.json({ success: true, observation });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to update AI overview observation" },
            { status: 400 }
        );
    }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
    const authorized = await assertAdmin();
    if (!authorized) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
        }

        await deleteAiOverviewObservation(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to delete AI overview observation" },
            { status: 400 }
        );
    }
}

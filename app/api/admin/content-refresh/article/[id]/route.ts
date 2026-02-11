import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { parseRefreshWorkflowStatus, updateArticleRefreshWorkflow } from "@/lib/content-refresh";

export const runtime = "nodejs";

type Params = {
    params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
    let session;
    try {
        session = await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ success: false, error: "Missing article id" }, { status: 400 });
        }

        const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        if (!payload || typeof payload !== "object") {
            return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
        }

        let status = null;
        if (Object.prototype.hasOwnProperty.call(payload, "status")) {
            status = parseRefreshWorkflowStatus(payload.status);
            if (!status) {
                return NextResponse.json(
                    { success: false, error: "Invalid refresh workflow status" },
                    { status: 400 }
                );
            }
        }

        let nextRefreshDueAt: Date | null | undefined;
        if (Object.prototype.hasOwnProperty.call(payload, "nextRefreshDueAt")) {
            const raw = String(payload.nextRefreshDueAt || "").trim();
            if (!raw) {
                nextRefreshDueAt = null;
            } else {
                const parsed = new Date(raw);
                if (!Number.isFinite(parsed.getTime())) {
                    return NextResponse.json(
                        { success: false, error: "nextRefreshDueAt must be a valid date" },
                        { status: 400 }
                    );
                }
                nextRefreshDueAt = parsed;
            }
        }

        const result = await updateArticleRefreshWorkflow({
            articleId: id,
            actorUserId: (session as any)?.user?.id || null,
            status,
            nextRefreshDueAt,
            note: typeof payload.note === "string" ? payload.note : null,
            markRefreshedSummary:
                typeof payload.markRefreshedSummary === "string" ? payload.markRefreshedSummary : null,
        });

        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        return NextResponse.json(
            {
                success: false,
                error: error?.message || "Failed to update refresh workflow",
            },
            { status: 400 }
        );
    }
}

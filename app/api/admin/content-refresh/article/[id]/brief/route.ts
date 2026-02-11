import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import { generateArticleRefreshBrief, getArticleRefreshDetail } from "@/lib/content-refresh";

export const runtime = "nodejs";

type Params = {
    params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ success: false, error: "Missing article id" }, { status: 400 });
        }

        const detail = await getArticleRefreshDetail(id);
        if (!detail) {
            return NextResponse.json({ success: false, error: "Article not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, detail });
    } catch (error: any) {
        return NextResponse.json(
            {
                success: false,
                error: error?.message || "Failed to load refresh brief details",
            },
            { status: 500 }
        );
    }
}

export async function POST(_request: NextRequest, { params }: Params) {
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

        const result = await generateArticleRefreshBrief({
            articleId: id,
            actorUserId: (session as any)?.user?.id || null,
        });

        const detail = await getArticleRefreshDetail(id);

        return NextResponse.json({ success: true, ...result, detail });
    } catch (error: any) {
        return NextResponse.json(
            {
                success: false,
                error: error?.message || "Failed to generate refresh brief",
            },
            { status: 500 }
        );
    }
}

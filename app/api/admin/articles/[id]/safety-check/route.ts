import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
    approveSafetyFlag,
    getDisclaimerLibrary,
    getLatestSafetyReview,
    overrideAllMustFix,
    parseReviewFlags,
    runArticleSafetyCheck,
    summarizeReview,
} from "@/lib/content-safety";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

function hashContent(content: string) {
    return crypto.createHash("sha256").update(content).digest("hex");
}

export async function GET(_request: NextRequest, { params }: { params: Params }) {
    let session;
    try {
        session = await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const [article, review, disclaimerLibrary] = await Promise.all([
            prisma.article.findUnique({ where: { id }, select: { id: true, content: true } }),
            getLatestSafetyReview(id),
            getDisclaimerLibrary(),
        ]);

        if (!article) {
            return NextResponse.json({ success: false, error: "Article not found" }, { status: 404 });
        }

        if (!review) {
            return NextResponse.json({
                success: true,
                review: null,
                flags: [],
                summary: null,
                stale: true,
                disclaimerLibrary,
            });
        }

        const currentHash = hashContent(article.content || "");
        const stale = currentHash !== review.contentHash;

        return NextResponse.json({
            success: true,
            review,
            flags: parseReviewFlags(review),
            summary: summarizeReview(review),
            stale,
            disclaimerLibrary,
            actorUserId: (session?.user as any)?.id || null,
        });
    } catch (error) {
        console.error("[AdminArticleSafetyAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load safety review" }, { status: 500 });
    }
}

export async function POST(_request: NextRequest, { params }: { params: Params }) {
    const session = await requireAdmin().catch(() => null);
    if (!session) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const review = await runArticleSafetyCheck({
            articleId: id,
            trigger: "MANUAL",
            actorUserId: (session.user as any)?.id || null,
        });

        return NextResponse.json({
            success: true,
            review,
            flags: parseReviewFlags(review),
            summary: summarizeReview(review),
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to run safety check" },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
    const session = await requireAdmin().catch(() => null);
    if (!session) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await params;

    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
        }

        const payload = body as Record<string, unknown>;
        const action = String(payload.action || "APPROVE_FLAG").trim().toUpperCase();
        const reviewId = String(payload.reviewId || "").trim();
        if (!reviewId) {
            return NextResponse.json({ success: false, error: "reviewId is required" }, { status: 400 });
        }

        let review;
        if (action === "OVERRIDE_ALL") {
            const reason = String(payload.reason || "").trim();
            if (!reason) {
                return NextResponse.json({ success: false, error: "Override reason is required" }, { status: 400 });
            }
            review = await overrideAllMustFix({
                reviewId,
                reason,
                actorUserId: (session.user as any)?.id || null,
            });
        } else {
            const flagId = String(payload.flagId || "").trim();
            const note = String(payload.note || "").trim();
            if (!flagId) {
                return NextResponse.json({ success: false, error: "flagId is required" }, { status: 400 });
            }
            review = await approveSafetyFlag({
                reviewId,
                flagId,
                note,
                actorUserId: (session.user as any)?.id || null,
            });
        }

        return NextResponse.json({
            success: true,
            review,
            flags: parseReviewFlags(review),
            summary: summarizeReview(review),
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to update safety review" },
            { status: 400 }
        );
    }
}

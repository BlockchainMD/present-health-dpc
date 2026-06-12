import { NextRequest, NextResponse } from "next/server";
import { ReviewResponseStatus } from "@prisma/client";

import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { parseResponseStatus, parseReviewPlatform } from "@/lib/reviews";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

function compactWhitespace(value: string) {
    return value.trim().replace(/\s+/g, " ");
}

function parseDateInput(value: unknown) {
    if (value === null) return null;
    const raw = compactWhitespace(String(value || ""));
    if (!raw) return null;
    const d = new Date(raw);
    if (!Number.isFinite(d.getTime())) return null;
    return d;
}

function parseRating(value: unknown) {
    const n = typeof value === "number" ? value : Number.parseInt(String(value || ""), 10);
    if (!Number.isFinite(n)) return null;
    const rounded = Math.round(n);
    if (rounded < 1 || rounded > 5) return null;
    return rounded;
}

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
    let session;
    try {
        session = await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
        }

        const payload = body as Record<string, unknown>;
        const existing = await prisma.publicReview.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }

        const data: Record<string, unknown> = {};

        if (payload.platform !== undefined) {
            data.platform = parseReviewPlatform(payload.platform);
        }
        if (payload.reviewerName !== undefined) {
            const reviewerName = compactWhitespace(String(payload.reviewerName || ""));
            if (!reviewerName) {
                return NextResponse.json({ success: false, error: "reviewer_name is required" }, { status: 400 });
            }
            data.reviewerName = reviewerName;
        }
        if (payload.rating !== undefined) {
            const rating = parseRating(payload.rating);
            if (!rating) {
                return NextResponse.json({ success: false, error: "rating must be 1-5" }, { status: 400 });
            }
            data.rating = rating;
        }
        if (payload.reviewText !== undefined) {
            const reviewText = compactWhitespace(String(payload.reviewText || ""));
            if (!reviewText) {
                return NextResponse.json({ success: false, error: "review_text is required" }, { status: 400 });
            }
            data.reviewText = reviewText;
        }
        if (payload.reviewDate !== undefined) {
            const reviewDate = parseDateInput(payload.reviewDate);
            if (!reviewDate) {
                return NextResponse.json({ success: false, error: "review_date is invalid" }, { status: 400 });
            }
            data.reviewDate = reviewDate;
        }
        if (payload.reviewUrl !== undefined) {
            const reviewUrl = compactWhitespace(String(payload.reviewUrl || ""));
            data.reviewUrl = reviewUrl || null;
        }

        if (payload.responseText !== undefined) {
            const responseText = compactWhitespace(String(payload.responseText || ""));
            data.responseText = responseText || null;
            if (responseText && existing.responseStatus === ReviewResponseStatus.PENDING && payload.responseStatus === undefined) {
                data.responseStatus = ReviewResponseStatus.DRAFTED;
            }
        }

        if (payload.approveResponse !== undefined) {
            const approveResponse = Boolean(payload.approveResponse);
            data.responseApprovedAt = approveResponse ? new Date() : null;
            if (approveResponse && existing.responseStatus === ReviewResponseStatus.PENDING && payload.responseStatus === undefined) {
                data.responseStatus = ReviewResponseStatus.DRAFTED;
            }
        }

        if (payload.respondedDate !== undefined) {
            if (payload.respondedDate === null) {
                data.respondedDate = null;
            } else {
                const respondedDate = parseDateInput(payload.respondedDate);
                if (!respondedDate) {
                    return NextResponse.json({ success: false, error: "responded_date is invalid" }, { status: 400 });
                }
                data.respondedDate = respondedDate;
            }
        }

        let nextStatus: ReviewResponseStatus | null = null;
        if (payload.responseStatus !== undefined) {
            nextStatus = parseResponseStatus(payload.responseStatus);
            if (!nextStatus) {
                return NextResponse.json({ success: false, error: "Invalid response_status" }, { status: 400 });
            }
            data.responseStatus = nextStatus;
        }

        const effectiveStatus = (data.responseStatus as ReviewResponseStatus | undefined) || existing.responseStatus;
        const effectiveResponseText =
            data.responseText !== undefined ? String(data.responseText || "").trim() : String(existing.responseText || "").trim();
        const effectiveApprovedAt =
            data.responseApprovedAt !== undefined ? (data.responseApprovedAt as Date | null) : existing.responseApprovedAt;

        if (effectiveStatus === ReviewResponseStatus.RESPONDED) {
            if (!effectiveResponseText) {
                return NextResponse.json({ success: false, error: "A response draft is required before marking responded" }, { status: 422 });
            }
            if (!effectiveApprovedAt) {
                return NextResponse.json({ success: false, error: "Response must be approved before marking responded" }, { status: 422 });
            }
            if (data.respondedDate === undefined && !existing.respondedDate) {
                data.respondedDate = new Date();
            }
        }

        if (effectiveStatus !== ReviewResponseStatus.RESPONDED && nextStatus !== null) {
            if (nextStatus === ReviewResponseStatus.SKIPPED || nextStatus === ReviewResponseStatus.PENDING || nextStatus === ReviewResponseStatus.DRAFTED) {
                if (payload.respondedDate === undefined) {
                    data.respondedDate = null;
                }
            }
        }

        const review = await prisma.publicReview.update({
            where: { id },
            data,
        });

        await prisma.auditLog.create({
            data: {
                actorUserId: (session?.user as any)?.id || null,
                action: "REVIEW_UPDATED",
                entityType: "PublicReview",
                entityId: review.id,
                metadata: {
                    updatedFields: Object.keys(data),
                },
            },
        });

        return NextResponse.json({ success: true, review });
    } catch (error: any) {
        console.error("[AdminReviewAPI] PATCH error:", error);
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to update review" },
            { status: 500 }
        );
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        await prisma.publicReview.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }
        console.error("[AdminReviewAPI] DELETE error:", error);
        return NextResponse.json({ success: false, error: "Failed to delete review" }, { status: 500 });
    }
}

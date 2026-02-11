import { NextRequest, NextResponse } from "next/server";
import { ReviewResponseStatus } from "@prisma/client";

import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
    parseBulkReviewImport,
    parseResponseStatus,
    parseReviewPlatform,
    validateReviewCreatePayload,
} from "@/lib/reviews";

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
    const statusRaw = (searchParams.get("status") || "").trim();
    const platformRaw = (searchParams.get("platform") || "").trim();
    const q = (searchParams.get("q") || "").trim();

    const page = clampInt(searchParams.get("page"), 1, 1, 5000);
    const pageSize = clampInt(searchParams.get("pageSize"), 25, 10, 100);

    const where: any = {};

    if (statusRaw && statusRaw.toUpperCase() !== "ALL") {
        const status = parseResponseStatus(statusRaw);
        if (status) where.responseStatus = status;
    }

    if (platformRaw && platformRaw.toUpperCase() !== "ALL") {
        where.platform = parseReviewPlatform(platformRaw);
    }

    if (q) {
        where.OR = [
            { reviewerName: { contains: q, mode: "insensitive" } },
            { reviewText: { contains: q, mode: "insensitive" } },
        ];
    }

    try {
        const skip = (page - 1) * pageSize;
        const [total, reviews] = await prisma.$transaction([
            prisma.publicReview.count({ where }),
            prisma.publicReview.findMany({
                where,
                orderBy: [{ reviewDate: "desc" }, { createdAt: "desc" }],
                skip,
                take: pageSize,
            }),
        ]);

        const withResponseTime = reviews.map((review) => {
            const responseTimeHours =
                review.respondedDate && review.reviewDate
                    ? Math.max(
                        0,
                        Number(
                            (
                                (new Date(review.respondedDate).getTime() - new Date(review.reviewDate).getTime()) /
                                (1000 * 60 * 60)
                            ).toFixed(2)
                        )
                    )
                    : null;
            return {
                ...review,
                responseTimeHours,
            };
        });

        return NextResponse.json({
            success: true,
            reviews: withResponseTime,
            total,
            page,
            pageSize,
        });
    } catch (error) {
        console.error("[AdminReviewsAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch reviews" }, { status: 500 });
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
        const action = String(payload.action || "CREATE").trim().toUpperCase();

        if (action === "BULK_IMPORT") {
            const raw = String(payload.raw || "");
            if (!raw.trim()) {
                return NextResponse.json({ success: false, error: "raw is required for bulk import" }, { status: 400 });
            }

            const fallbackPlatform = payload.fallbackPlatform
                ? parseReviewPlatform(payload.fallbackPlatform)
                : undefined;
            const parsed = parseBulkReviewImport(raw, fallbackPlatform);
            if (!parsed.items.length) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "No valid reviews parsed from input",
                        parsedCount: 0,
                        errors: parsed.errors,
                    },
                    { status: 400 }
                );
            }

            const created = await prisma.$transaction(
                parsed.items.map((item) =>
                    prisma.publicReview.create({
                        data: {
                            platform: item.platform,
                            reviewerName: item.reviewerName,
                            rating: item.rating,
                            reviewText: item.reviewText,
                            reviewDate: item.reviewDate,
                            reviewUrl: item.reviewUrl,
                            responseStatus: ReviewResponseStatus.PENDING,
                        },
                    })
                )
            );

            await prisma.auditLog.create({
                data: {
                    actorUserId: (session?.user as any)?.id || null,
                    action: "REVIEWS_BULK_IMPORTED",
                    entityType: "PublicReview",
                    entityId: "bulk",
                    metadata: {
                        createdCount: created.length,
                        parseErrorCount: parsed.errors.length,
                    },
                },
            });

            return NextResponse.json({
                success: true,
                createdCount: created.length,
                createdIds: created.map((x) => x.id),
                errors: parsed.errors,
            });
        }

        const input = validateReviewCreatePayload(payload);
        const review = await prisma.publicReview.create({
            data: {
                platform: input.platform,
                reviewerName: input.reviewerName,
                rating: input.rating,
                reviewText: input.reviewText,
                reviewDate: input.reviewDate,
                reviewUrl: input.reviewUrl,
                responseStatus: ReviewResponseStatus.PENDING,
            },
        });

        return NextResponse.json({ success: true, review });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to create reviews" },
            { status: 400 }
        );
    }
}

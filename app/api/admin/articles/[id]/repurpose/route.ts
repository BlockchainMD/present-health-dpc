import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authz";
import {
    computeRepurposeCompleteness,
    generateArticleRepurpose,
    getArticleRepurposeState,
    parseRepurposeFormat,
    updateArticleRepurposeAsset,
} from "@/lib/content-repurpose";

export const runtime = "nodejs";

type Params = { id: string } | Promise<{ id: string }>;

function parseSubjects(value: unknown) {
    if (value === null) return null;
    if (Array.isArray(value)) {
        return value
            .map((x) => String(x || "").trim())
            .filter(Boolean)
            .slice(0, 3);
    }

    if (typeof value === "string") {
        return value
            .split(/\n|\||,/g)
            .map((x) => x.trim())
            .filter(Boolean)
            .slice(0, 3);
    }

    return undefined;
}

export async function GET(_request: NextRequest, { params }: { params: Params }) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const state = await getArticleRepurposeState(id);

        return NextResponse.json({
            success: true,
            article: {
                id: state.article.id,
                title: state.article.title,
                slug: state.article.slug,
            },
            articleUrl: state.articleUrl,
            stale: state.stale,
            completeness: state.completeness,
            asset: state.asset,
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to load repurposed content" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
    let session;
    try {
        session = await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const body = await request.json().catch(() => ({}));
        const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

        const mode = parseRepurposeFormat(payload.mode);
        const force = typeof payload.force === "boolean" ? payload.force : mode !== "ALL";

        const result = await generateArticleRepurpose({
            articleId: id,
            mode,
            force,
            trigger: mode === "ALL" ? "MANUAL_GENERATE" : "MANUAL_REGENERATE",
            actorUserId: (session?.user as any)?.id || null,
        });

        const completeness = computeRepurposeCompleteness(result.asset);
        const state = await getArticleRepurposeState(id);

        return NextResponse.json({
            success: true,
            mode: result.mode,
            skipped: result.skipped,
            stale: state.stale,
            completeness,
            asset: result.asset,
            articleUrl: state.articleUrl,
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to generate repurposed content" },
            { status: 500 }
        );
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

    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
        }

        const payload = body as Record<string, unknown>;

        const asset = await updateArticleRepurposeAsset({
            articleId: id,
            actorUserId: (session?.user as any)?.id || null,
            data: {
                linkedinPost:
                    payload.linkedinPost === undefined
                        ? undefined
                        : payload.linkedinPost === null
                            ? null
                            : String(payload.linkedinPost),
                xThread:
                    payload.xThread === undefined
                        ? undefined
                        : payload.xThread === null
                            ? null
                            : String(payload.xThread),
                shortVideoScript:
                    payload.shortVideoScript === undefined
                        ? undefined
                        : payload.shortVideoScript === null
                            ? null
                            : String(payload.shortVideoScript),
                newsletterSnippet:
                    payload.newsletterSnippet === undefined
                        ? undefined
                        : payload.newsletterSnippet === null
                            ? null
                            : String(payload.newsletterSnippet),
                newsletterSubjectOptions: parseSubjects(payload.newsletterSubjectOptions),
                linkedinPublished:
                    payload.linkedinPublished === undefined
                        ? undefined
                        : Boolean(payload.linkedinPublished),
                xPublished:
                    payload.xPublished === undefined
                        ? undefined
                        : Boolean(payload.xPublished),
                videoPublished:
                    payload.videoPublished === undefined
                        ? undefined
                        : Boolean(payload.videoPublished),
                newsletterPublished:
                    payload.newsletterPublished === undefined
                        ? undefined
                        : Boolean(payload.newsletterPublished),
            },
        });

        const state = await getArticleRepurposeState(id);

        return NextResponse.json({
            success: true,
            asset,
            stale: state.stale,
            completeness: computeRepurposeCompleteness(asset),
            articleUrl: state.articleUrl,
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to update repurposed content" },
            { status: 400 }
        );
    }
}

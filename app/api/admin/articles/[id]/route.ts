import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';
import { getSeoHealthSnapshot } from '@/lib/seo-health/service';
import { revalidatePath } from 'next/cache';
import { lintMarkdown } from '@/lib/content-engine/lint';
import { stripTemplateOwnedSections } from '@/lib/content-engine/sections';
import { normalizeMarkdown } from '@/lib/content-engine/format';
import { repairMarkdown } from '@/lib/content-engine/repair';
import { slugify } from '@/lib/slug';
import { enforcePublishSafety, parseReviewFlags, runArticleSafetyCheck, summarizeReview } from '@/lib/content-safety';
import { generateArticleRepurpose } from '@/lib/content-repurpose';

export const runtime = 'nodejs';

type FaqItem = { question: string; answer: string };

function coerceFaqs(value: unknown): FaqItem[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const obj = item as Record<string, unknown>;
            const question = typeof obj.question === 'string' ? obj.question.trim() : '';
            const answer = typeof obj.answer === 'string' ? obj.answer.trim() : '';
            if (!question || !answer) return null;
            return { question, answer };
        })
        .filter((x): x is FaqItem => Boolean(x));
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    let session;
    try {
        session = await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { id } = await params;
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
        }
        const {
            status,
            title,
            content,
            slug,
            excerpt,
            metaTitle,
            metaDescription,
            category,
            schemaType,
            faqs,
            featuredImage,
            authorPhysicianId,
            publishedAt,
            refreshRequested,
            lastRefreshedAt,
            reviewedByDisplayName,
            reviewType,
            forcePublish,
            safetyOverrideReason,
        } = body;

        // Only include fields that are actually provided
        const updateData: {
            status?: string;
            title?: string;
            content?: string;
            slug?: string;
            excerpt?: string;
            metaTitle?: string;
            metaDescription?: string;
            category?: string | null;
            schemaType?: string | null;
            faqs?: any;
            featuredImage?: string | null;
            authorPhysicianId?: string | null;
            publishedAt?: Date | null;
            refreshRequested?: boolean;
            lastRefreshedAt?: Date | null;
            reviewedByDisplayName?: string;
            reviewType?: string;
            reviewedAt?: Date;
        } = {};
        if (status !== undefined) {
            const allowed = new Set(['DRAFT', 'READY_FOR_REVIEW', 'PUBLISHED', 'ARCHIVED', 'DISCARDED']);
            if (!allowed.has(status)) {
                return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
            }
            updateData.status = status;
        }
        if (title !== undefined) updateData.title = typeof title === 'string' ? title.trim() : title;
        if (content !== undefined) updateData.content = content;
        if (slug !== undefined) {
            const trimmed = typeof slug === 'string' ? slug.trim() : '';
            if (!trimmed) {
                return NextResponse.json({ success: false, error: 'Slug cannot be empty' }, { status: 400 });
            }
            updateData.slug = trimmed;
        }
        if (excerpt !== undefined) updateData.excerpt = typeof excerpt === 'string' ? excerpt.trim() : excerpt;
        if (metaTitle !== undefined) updateData.metaTitle = typeof metaTitle === 'string' ? metaTitle.trim() : metaTitle;
        if (metaDescription !== undefined) updateData.metaDescription = typeof metaDescription === 'string' ? metaDescription.trim() : metaDescription;
        if (category !== undefined) {
            const v = typeof category === 'string' ? category.trim() : category;
            updateData.category = typeof v === 'string' && v ? v : v === '' ? null : (v as any);
        }
        if (schemaType !== undefined) {
            const v = typeof schemaType === 'string' ? schemaType.trim() : schemaType;
            updateData.schemaType = typeof v === 'string' && v ? v : v === '' ? null : (v as any);
        }
        if (featuredImage !== undefined) {
            const v = typeof featuredImage === 'string' ? featuredImage.trim() : featuredImage;
            updateData.featuredImage = typeof v === 'string' && v ? v : v === '' ? null : (v as any);
        }
        if (authorPhysicianId !== undefined) {
            const v = typeof authorPhysicianId === 'string' ? authorPhysicianId.trim() : authorPhysicianId;
            updateData.authorPhysicianId = typeof v === 'string' && v ? v : v === '' ? null : (v as any);
        }
        if (faqs !== undefined) {
            updateData.faqs = coerceFaqs(faqs);
        }
        if (publishedAt !== undefined) {
            if (publishedAt === null) {
                updateData.publishedAt = null;
            } else if (typeof publishedAt === 'string' && publishedAt.trim()) {
                const d = new Date(publishedAt);
                if (!Number.isFinite(d.getTime())) {
                    return NextResponse.json({ success: false, error: 'publishedAt must be a valid ISO date' }, { status: 400 });
                }
                updateData.publishedAt = d;
            } else {
                return NextResponse.json({ success: false, error: 'publishedAt must be an ISO string or null' }, { status: 400 });
            }
        }
        if (refreshRequested !== undefined) {
            updateData.refreshRequested = typeof refreshRequested === 'boolean' ? refreshRequested : refreshRequested;
        }
        if (lastRefreshedAt !== undefined) {
            if (lastRefreshedAt === null) {
                updateData.lastRefreshedAt = null;
            } else if (typeof lastRefreshedAt === 'string' && lastRefreshedAt.trim()) {
                const d = new Date(lastRefreshedAt);
                if (!Number.isFinite(d.getTime())) {
                    return NextResponse.json({ success: false, error: 'lastRefreshedAt must be a valid ISO date' }, { status: 400 });
                }
                updateData.lastRefreshedAt = d;
            } else {
                return NextResponse.json({ success: false, error: 'lastRefreshedAt must be an ISO string or null' }, { status: 400 });
            }
        }
        if (reviewedByDisplayName !== undefined) updateData.reviewedByDisplayName = reviewedByDisplayName;
        if (reviewType !== undefined) {
            if (!['CLINICAL', 'EDITORIAL'].includes(reviewType)) {
                return NextResponse.json({ success: false, error: 'Invalid reviewType' }, { status: 400 });
            }
            updateData.reviewType = reviewType;
        }

        if (content !== undefined) {
            updateData.content = stripTemplateOwnedSections(String(content));
        }

        if (status === 'PUBLISHED') {
            const existing = await prisma.article.findUnique({ where: { id } });
            const effectiveTitle = (updateData.title || existing?.title || '').toString().trim();
            let effectiveSlug = (updateData.slug || existing?.slug || '').toString().trim();
            if (!effectiveSlug && effectiveTitle) {
                effectiveSlug = slugify(effectiveTitle);
                if (effectiveSlug) updateData.slug = effectiveSlug;
            }
            if (!effectiveSlug) {
                return NextResponse.json({ success: false, error: 'Slug is required to publish.' }, { status: 400 });
            }

            if (updateData.publishedAt === undefined) {
                // If no publish date is provided, default to "now" the first time it becomes published.
                if (!existing?.publishedAt) {
                    updateData.publishedAt = new Date();
                }
            } else if (updateData.publishedAt === null) {
                // Avoid null publish date for published articles.
                updateData.publishedAt = new Date();
            }

            const rawContent = (updateData.content ?? existing?.content ?? '').toString();
            const brief = (existing?.briefJson || {}) as { actionSteps?: string[]; primaryQuestion?: string };
            const normalized = normalizeMarkdown(
                repairMarkdown(stripTemplateOwnedSections(rawContent)),
                {
                    title: effectiveTitle,
                    primaryQuestion: brief.primaryQuestion || existing?.title || '',
                    actionSteps: brief.actionSteps || []
                }
            );
            if (normalized && normalized !== rawContent) {
                updateData.content = normalized;
            }
            const lintTarget = updateData.content ?? rawContent;
            const lintIssues = lintMarkdown(lintTarget.toString());
            if (lintIssues.length > 0) {
                return NextResponse.json(
                    { success: false, error: 'Content failed formatting checks.', issues: lintIssues },
                    { status: 422 }
                );
            }

            const safetyGate = await enforcePublishSafety({
                articleId: id,
                actorUserId: session?.user?.id,
                overrideReason: typeof safetyOverrideReason === 'string' ? safetyOverrideReason : null,
                articleDraft: {
                    title: effectiveTitle,
                    slug: effectiveSlug || null,
                    category: (updateData.category ?? existing?.category ?? null) as string | null,
                    content: lintTarget.toString(),
                },
            });
            if (!safetyGate.allowed) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Content safety review found unresolved must-fix issues. Resolve or apply an override reason.',
                        safetyReview: safetyGate.review,
                        safetySummary: safetyGate.summary,
                        safetyFlags: safetyGate.flags,
                    },
                    { status: 422 }
                );
            }

            const isPublishing = existing?.status !== 'PUBLISHED';
            if (isPublishing) {
                try {
                    const snapshot = await getSeoHealthSnapshot({ refreshIfStale: true });
                    if (snapshot.report.status === 'RED' && snapshot.config.hardStopOnRed) {
                        if (forcePublish) {
                            await prisma.auditLog.create({
                                data: {
                                    actorUserId: session?.user?.id,
                                    action: 'SEO_HEALTH_PUBLISH_OVERRIDE',
                                    entityType: 'Article',
                                    entityId: id,
                                    metadata: {
                                        status: snapshot.report.status,
                                        indexRate: snapshot.report.indexRate
                                    }
                                }
                            });
                        } else {
                        await prisma.auditLog.create({
                            data: {
                                actorUserId: session?.user?.id,
                                action: 'SEO_HEALTH_BLOCK_PUBLISH',
                                entityType: 'Article',
                                entityId: id,
                                metadata: {
                                    status: snapshot.report.status,
                                    indexRate: snapshot.report.indexRate
                                }
                            }
                        });
                        return NextResponse.json(
                            { success: false, error: 'Publishing is temporarily disabled due to RED SEO Health status.' },
                            { status: 423 }
                        );
                        }
                    }
                } catch (error) {
                    console.warn('SEO health check failed during publish.', error);
                }
            }
            let effectiveReviewType = reviewType;
            if (!effectiveReviewType) {
                effectiveReviewType = existing?.reviewType || 'CLINICAL';
                if (existing?.reviewType && reviewType === undefined) {
                    updateData.reviewType = existing.reviewType;
                }
            }
            updateData.reviewedAt = new Date();
            if (!updateData.reviewedByDisplayName) {
                updateData.reviewedByDisplayName = effectiveReviewType === 'EDITORIAL'
                    ? 'Present Health Editorial Team'
                    : 'Present Health Clinical Team';
            }
        }

        const article = await prisma.article.update({
            where: { id },
            data: updateData
        });

        let autoSafetyReview: any = null;
        if (status === 'READY_FOR_REVIEW') {
            try {
                autoSafetyReview = await runArticleSafetyCheck({
                    articleId: id,
                    trigger: 'AUTO_READY_FOR_REVIEW',
                    actorUserId: session?.user?.id,
                });
            } catch (error) {
                console.error('Auto safety check failed for READY_FOR_REVIEW status', error);
            }
        }

        let autoRepurposeAsset: any = null;
        if (status === 'PUBLISHED') {
            try {
                const generated = await generateArticleRepurpose({
                    articleId: id,
                    mode: 'ALL',
                    trigger: 'AUTO_PUBLISH',
                    actorUserId: session?.user?.id,
                    force: false,
                });
                autoRepurposeAsset = generated.asset;
            } catch (error) {
                console.error('Auto repurpose generation failed during publish', error);
            }
        }

        if (status === 'PUBLISHED') {
            revalidatePath('/blog');
            if (article.slug) {
                revalidatePath(`/blog/${article.slug}`);
            }
            revalidatePath('/learn');
            if (article.slug) {
                revalidatePath(`/learn/${article.slug}`);
            } else {
                revalidatePath(`/learn/${article.id}`);
            }
        }
        if (status === 'DISCARDED' || status === 'ARCHIVED') {
            revalidatePath('/blog');
            if (article.slug) {
                revalidatePath(`/blog/${article.slug}`);
            }
            revalidatePath('/learn');
            if (article.slug) {
                revalidatePath(`/learn/${article.slug}`);
            } else {
                revalidatePath(`/learn/${article.id}`);
            }
        }
        if (status === 'DRAFT' || status === 'READY_FOR_REVIEW') {
            revalidatePath('/blog');
            if (article.slug) {
                revalidatePath(`/blog/${article.slug}`);
            }
            revalidatePath('/learn');
            if (article.slug) {
                revalidatePath(`/learn/${article.slug}`);
            } else {
                revalidatePath(`/learn/${article.id}`);
            }
        }

        return NextResponse.json({
            success: true,
            article,
            safetyReview: autoSafetyReview,
            safetyFlags: autoSafetyReview ? parseReviewFlags(autoSafetyReview) : undefined,
            safetySummary: autoSafetyReview ? summarizeReview(autoSafetyReview) : undefined,
            repurposeAsset: autoRepurposeAsset,
        });
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return NextResponse.json(
                { success: false, error: 'Slug already exists' },
                { status: 409 }
            );
        }
        console.error('PATCH error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update article' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { id } = await params;

        await prisma.article.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete article' },
            { status: 500 }
        );
    }
}

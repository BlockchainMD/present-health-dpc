import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { id } = params;
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
            reviewedByDisplayName,
            reviewType
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
            reviewedByDisplayName?: string;
            reviewType?: string;
            reviewedAt?: Date;
        } = {};
        if (status !== undefined) {
            const allowed = new Set(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
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
        if (reviewedByDisplayName !== undefined) updateData.reviewedByDisplayName = reviewedByDisplayName;
        if (reviewType !== undefined) {
            if (!['CLINICAL', 'EDITORIAL'].includes(reviewType)) {
                return NextResponse.json({ success: false, error: 'Invalid reviewType' }, { status: 400 });
            }
            updateData.reviewType = reviewType;
        }

        if (status === 'PUBLISHED') {
            let effectiveReviewType = reviewType;
            if (!effectiveReviewType) {
                const existing = await prisma.article.findUnique({ where: { id } });
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

        return NextResponse.json({ success: true, article });
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
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { id } = params;

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

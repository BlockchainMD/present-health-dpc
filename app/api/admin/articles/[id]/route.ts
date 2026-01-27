import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
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
        if (status !== undefined) updateData.status = status;
        if (title !== undefined) updateData.title = title;
        if (content !== undefined) updateData.content = content;
        if (slug !== undefined) updateData.slug = slug;
        if (excerpt !== undefined) updateData.excerpt = excerpt;
        if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
        if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
        if (reviewedByDisplayName !== undefined) updateData.reviewedByDisplayName = reviewedByDisplayName;
        if (reviewType !== undefined) updateData.reviewType = reviewType;

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
    } catch (error) {
        console.error('PATCH error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update article' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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

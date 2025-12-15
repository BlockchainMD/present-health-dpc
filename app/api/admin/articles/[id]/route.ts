import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status, title, content } = body;

        // Only include fields that are actually provided
        const updateData: { status?: string; title?: string; content?: string } = {};
        if (status !== undefined) updateData.status = status;
        if (title !== undefined) updateData.title = title;
        if (content !== undefined) updateData.content = content;

        const article = await prisma.article.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({ success: true, article });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to update article' },
            { status: 500 }
        );
    }
}

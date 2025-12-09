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

        const article = await prisma.article.update({
            where: { id },
            data: {
                status,
                title,
                content
            }
        });

        return NextResponse.json({ success: true, article });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to update article' },
            { status: 500 }
        );
    }
}

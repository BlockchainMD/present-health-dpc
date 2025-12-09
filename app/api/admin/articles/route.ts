import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    try {
        const where = status ? { status } : {};

        const articles = await prisma.article.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ success: true, articles });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to fetch articles' },
            { status: 500 }
        );
    }
}

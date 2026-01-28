import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';

export async function GET(request: Request) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    try {
        const allowed = new Set(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
        const where = status && allowed.has(status) ? { status } : {};

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

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';
import { proofreadDraft } from '@/lib/content-engine/proofread';
import { qaDraft } from '@/lib/content-engine/qa';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

export async function POST(
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
        const article = await prisma.article.findUnique({ where: { id } });
        if (!article) {
            return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
        }

        const brief = (article.briefJson || {}) as any;
        const draft = {
            title: article.title,
            excerpt: article.excerpt || '',
            metaTitle: article.metaTitle || article.title,
            metaDescription: article.metaDescription || article.excerpt || '',
            content: article.content || ''
        };

        const revised = await proofreadDraft(brief, draft);
        if (!revised) {
            return NextResponse.json({ success: false, error: 'Proofread failed' }, { status: 500 });
        }

        const qa = qaDraft(brief, revised, { reviewLabel: article.reviewedByDisplayName || undefined });

        const updated = await prisma.article.update({
            where: { id },
            data: {
                title: qa.title || article.title,
                excerpt: qa.excerpt || article.excerpt,
                metaTitle: qa.metaTitle || article.metaTitle,
                metaDescription: qa.metaDescription || article.metaDescription,
                content: qa.content
            }
        });

        revalidatePath('/blog');
        if (updated.slug) {
            revalidatePath(`/blog/${updated.slug}`);
        }

        return NextResponse.json({ success: true, article: updated });
    } catch (error) {
        console.error('Proofread article error', error);
        return NextResponse.json({ success: false, error: 'Failed to proofread article' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';
import { normalizeMarkdown } from '@/lib/content-engine/format';
import { stripTemplateOwnedSections } from '@/lib/content-engine/sections';
import { repairMarkdown } from '@/lib/content-engine/repair';
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

        const brief = (article.briefJson || {}) as { actionSteps?: string[]; primaryQuestion?: string };
        const repaired = repairMarkdown(article.content || '');
        const normalized = normalizeMarkdown(repaired, {
            title: article.title,
            primaryQuestion: brief.primaryQuestion || article.title,
            actionSteps: brief.actionSteps || []
        });
        const cleaned = stripTemplateOwnedSections(normalized);

        const updated = await prisma.article.update({
            where: { id },
            data: { content: cleaned }
        });

        revalidatePath('/blog');
        if (updated.slug) {
            revalidatePath(`/blog/${updated.slug}`);
        }

        return NextResponse.json({ success: true, article: updated });
    } catch (error) {
        console.error('Normalize article error', error);
        return NextResponse.json({ success: false, error: 'Failed to normalize article' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';
import { generateJson } from '@/lib/content-engine/gemini';
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
        const body = await request.json().catch(() => null);
        const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
        if (!prompt) {
            return NextResponse.json({ success: false, error: 'Prompt is required.' }, { status: 400 });
        }
        if (prompt.length > 1200) {
            return NextResponse.json({ success: false, error: 'Prompt is too long.' }, { status: 400 });
        }

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

        const revisePrompt = `
You are revising an existing draft. Apply the user's instructions precisely while keeping the content medically safe, concise, and readable.

User instructions:
${prompt}

Rules:
- Preserve the required section headings and order.
- Keep the writing concise and skimmable.
- Do NOT add an H1 or repeat the article title in the body.
- Do NOT include education disclaimer, emergency guidance, or reviewed-by blocks.
- Do NOT add clinician names or personalized medical advice.
- Avoid hype/guarantees; keep cautious language.

DRAFT JSON:
${JSON.stringify(draft, null, 2)}

Return JSON only with the same keys:
{
  "title": "...",
  "excerpt": "...",
  "metaTitle": "...",
  "metaDescription": "...",
  "content": "Markdown content"
}
`;

        const revised = await generateJson<any>(revisePrompt, 0.3);
        if (!revised) {
            return NextResponse.json({ success: false, error: 'LLM revision failed.' }, { status: 500 });
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
        console.error('Revise article error', error);
        return NextResponse.json({ success: false, error: 'Failed to revise article' }, { status: 500 });
    }
}

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';
import { slugify } from '@/lib/slug';
import { runArticleSafetyCheck } from '@/lib/content-safety';
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

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    try {
        const allowed = new Set(['DRAFT', 'READY_FOR_REVIEW', 'PUBLISHED', 'ARCHIVED', 'DISCARDED']);
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

export async function POST(request: NextRequest) {
    let session;
    try {
        session = await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
        }
        const payload = body as Record<string, unknown>;

        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        if (!title) {
            return NextResponse.json({ success: false, error: 'Missing required field: title' }, { status: 400 });
        }

        const content = typeof payload.content === 'string' ? payload.content : '';

        const allowedStatus = new Set(['DRAFT', 'READY_FOR_REVIEW', 'PUBLISHED', 'ARCHIVED', 'DISCARDED']);
        const status = typeof payload.status === 'string' && allowedStatus.has(payload.status) ? payload.status : 'DRAFT';

        let slug = typeof payload.slug === 'string' ? payload.slug.trim() : '';
        if (!slug) slug = slugify(title);
        if (!slug) slug = '';

        const metaTitle = typeof payload.metaTitle === 'string' ? payload.metaTitle.trim() : '';
        const metaDescription = typeof payload.metaDescription === 'string' ? payload.metaDescription.trim() : '';
        const excerpt = typeof payload.excerpt === 'string' ? payload.excerpt.trim() : '';

        const category = typeof payload.category === 'string' ? payload.category.trim() : '';
        const schemaType = typeof payload.schemaType === 'string' ? payload.schemaType.trim() : '';
        const featuredImage = typeof payload.featuredImage === 'string' ? payload.featuredImage.trim() : '';

        const authorPhysicianId = typeof payload.authorPhysicianId === 'string' ? payload.authorPhysicianId.trim() : '';
        const refreshRequested = typeof payload.refreshRequested === 'boolean' ? payload.refreshRequested : false;

        let publishedAt: Date | null = null;
        if (typeof payload.publishedAt === 'string' && payload.publishedAt.trim()) {
            const d = new Date(payload.publishedAt);
            if (!Number.isFinite(d.getTime())) {
                return NextResponse.json({ success: false, error: 'publishedAt must be a valid ISO date' }, { status: 400 });
            }
            publishedAt = d;
        } else if (payload.publishedAt === null) {
            publishedAt = null;
        }

        if (status === 'PUBLISHED' && !publishedAt) {
            publishedAt = new Date();
        }

        const faqs = coerceFaqs(payload.faqs);

        const article = await prisma.article.create({
            data: {
                title,
                content,
                slug: slug || null,
                status,
                publishedAt,
                metaTitle: metaTitle || null,
                metaDescription: metaDescription || null,
                excerpt: excerpt || null,
                category: category || null,
                schemaType: schemaType || null,
                featuredImage: featuredImage || null,
                authorPhysicianId: authorPhysicianId || null,
                refreshRequested,
                faqs,
            },
        });

        let autoSafetyReview: any = null;
        if (status === 'READY_FOR_REVIEW') {
            try {
                autoSafetyReview = await runArticleSafetyCheck({
                    articleId: article.id,
                    trigger: 'AUTO_READY_FOR_REVIEW',
                    actorUserId: session?.user?.id,
                });
            } catch (error) {
                console.error('[AdminArticlesAPI] auto safety check failed:', error);
            }
        }

        let autoRepurposeAsset: any = null;
        if (status === 'PUBLISHED') {
            try {
                const generated = await generateArticleRepurpose({
                    articleId: article.id,
                    mode: 'ALL',
                    trigger: 'AUTO_PUBLISH',
                    actorUserId: session?.user?.id,
                    force: false,
                });
                autoRepurposeAsset = generated.asset;
            } catch (error) {
                console.error('[AdminArticlesAPI] auto repurpose generation failed:', error);
            }
        }

        return NextResponse.json({ success: true, article, safetyReview: autoSafetyReview, repurposeAsset: autoRepurposeAsset });
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return NextResponse.json({ success: false, error: 'Slug already exists' }, { status: 409 });
        }
        console.error('[AdminArticlesAPI] POST error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create article' }, { status: 500 });
    }
}

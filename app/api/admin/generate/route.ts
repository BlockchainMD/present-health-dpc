import { NextResponse, NextRequest } from 'next/server';
import { runContentEngine } from '@/lib/content-engine/engine';
import { requireAdmin } from '@/lib/authz';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json().catch(() => ({}));
        const options = typeof body === 'object' && body !== null ? body : {};
        const count = typeof options.count === 'number' ? options.count : Number(options.count);
        const safeCount = Number.isFinite(count) ? Math.min(Math.max(count, 1), 10) : undefined;

        const mode = ['BALANCED', 'TREND', 'RESEARCH'].includes(options.mode) ? options.mode : undefined;
        const reviewType = ['CLINICAL', 'EDITORIAL'].includes(options.reviewType) ? options.reviewType : undefined;

        const result = await runContentEngine({
            count: safeCount,
            mode,
            autoPublish: options.autoPublish,
            useFeedback: options.useFeedback,
            reviewLabel: options.reviewLabel,
            reviewType,
            sources: options.sources
        });

        return NextResponse.json({
            success: true,
            count: result.created,
            published: result.published,
            articles: result.articles
        });
    } catch (error) {
        console.error('Generation error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate articles' },
            { status: 500 }
        );
    }
}

import { NextResponse } from 'next/server';
import { runContentEngine } from '@/lib/content-engine/engine';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const options = typeof body === 'object' && body !== null ? body : {};

        const result = await runContentEngine({
            count: options.count,
            mode: options.mode,
            autoPublish: options.autoPublish,
            reviewLabel: options.reviewLabel,
            reviewType: options.reviewType,
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

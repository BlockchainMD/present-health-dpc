import { NextResponse } from 'next/server';
import { fetchTrends } from '@/lib/trends';
import { prisma } from '@/lib/prisma';

export async function POST() {
    try {
        // Dynamically import AI module to prevent build-time initialization errors
        const { generateArticleContent } = await import('@/lib/ai');

        // 1. Fetch Trends
        const trends = await fetchTrends();

        // Take top 1 trend
        const topTrends = trends.slice(0, 1);

        const generatedArticles = [];

        // 2. Generate Content for each
        for (const trend of topTrends) {
            const aiContent = await generateArticleContent(trend.title);

            // 3. Save to DB
            const article = await prisma.article.create({
                data: {
                    title: aiContent.title,
                    content: aiContent.content,
                    status: 'DRAFT',
                    sourceUrl: trend.link
                }
            });

            generatedArticles.push(article);
        }

        return NextResponse.json({
            success: true,
            count: generatedArticles.length,
            articles: generatedArticles
        });

    } catch (error) {
        console.error('Generation error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate articles' },
            { status: 500 }
        );
    }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Instead of running migrations via CLI (which can crash serverless containers),
        // we'll just execute the raw SQL to create the tables if they don't exist.

        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Campaign" (
        "id" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "persona" TEXT NOT NULL,
        "intent" TEXT NOT NULL,
        "seedKeywords" TEXT[],
        "benefits" TEXT[],
        "proofPoints" TEXT[],
        "disclaimers" TEXT[],
        "landingSlug" TEXT NOT NULL,
        "budgetDaily" DOUBLE PRECISION NOT NULL,
        "targetCpa" DOUBLE PRECISION NOT NULL,
        "geo" TEXT,
        "tone" TEXT,
        "status" TEXT NOT NULL DEFAULT 'DRAFT',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        
        CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
      );
    `);

        await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Campaign_slug_key" ON "Campaign"("slug");
    `);

        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CampaignRun" (
        "id" TEXT NOT NULL,
        "campaignId" TEXT NOT NULL,
        "chosenKeywords" TEXT[],
        "matchTypes" TEXT[],
        "negativeKeywords" TEXT[],
        "rsaHeadlines" TEXT[],
        "rsaDescriptions" TEXT[],
        "finalUrl" TEXT,
        "landingPageContent" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "googleAdsResourceIds" JSONB,
        "metrics" JSONB,
        "lastMetricsSync" TIMESTAMP(3),
        "complianceCheckResults" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        
        CONSTRAINT "CampaignRun_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "CampaignRun_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

        // Check if tables exist now
        const campaigns = await prisma.$queryRawUnsafe('SELECT COUNT(*) FROM "Campaign"');

        return NextResponse.json({
            status: 'success',
            message: 'Tables created successfully',
            campaigns
        });
    } catch (error: any) {
        console.error('Migration failed:', error);
        return NextResponse.json({
            status: 'error',
            message: error.message
        }, { status: 500 });
    }
}

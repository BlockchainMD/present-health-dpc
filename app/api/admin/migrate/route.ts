import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }
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
        "geoStates" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "tone" TEXT,
        "status" TEXT NOT NULL DEFAULT 'DRAFT',
        "layoutType" TEXT NOT NULL DEFAULT 'CONVERSION',
        "strategy" TEXT NOT NULL DEFAULT 'TRANSACTIONAL',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Campaign_slug_key" ON "Campaign"("slug");
    `);

    await prisma.$executeRawUnsafe(`ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "geoStates" TEXT[] DEFAULT ARRAY[]::TEXT[];`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "layoutType" TEXT DEFAULT 'CONVERSION';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "strategy" TEXT DEFAULT 'TRANSACTIONAL';`);

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
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT "CampaignRun_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "CampaignRun_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`ALTER TABLE "CampaignRun" ADD COLUMN IF NOT EXISTS "artifacts" JSONB;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "CampaignRun" ADD COLUMN IF NOT EXISTS "educationalContent" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "CampaignRun" ADD COLUMN IF NOT EXISTS "googleAdGroupId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "CampaignRun" ADD COLUMN IF NOT EXISTS "googleCampaignId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "CampaignRun" ADD COLUMN IF NOT EXISTS "googleCustomerId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "CampaignRun" ADD COLUMN IF NOT EXISTS "googleResourceName" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "CampaignRun" ADD COLUMN IF NOT EXISTS "googleSyncStatus" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "CampaignRun" ADD COLUMN IF NOT EXISTS "metaCampaignId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "CampaignRun" ADD COLUMN IF NOT EXISTS "metaAdSetId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "CampaignRun" ADD COLUMN IF NOT EXISTS "metaAdsResourceIds" JSONB;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "CampaignRun" ADD COLUMN IF NOT EXISTS "metaSyncStatus" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "CampaignRun" ADD COLUMN IF NOT EXISTS "indexing" TEXT DEFAULT 'NOINDEX';`);

    // Add CampaignMetric table for time-series metrics
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CampaignMetric" (
        "id" TEXT NOT NULL,
        "campaignRunId" TEXT NOT NULL,
        "date" TIMESTAMP(3) NOT NULL,
        "platform" TEXT NOT NULL DEFAULT 'GOOGLE_ADS',
        "impressions" INTEGER NOT NULL DEFAULT 0,
        "clicks" INTEGER NOT NULL DEFAULT 0,
        "conversions" INTEGER NOT NULL DEFAULT 0,
        "cost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT "CampaignMetric_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "CampaignMetric_campaignRunId_fkey" FOREIGN KEY ("campaignRunId") REFERENCES "CampaignRun"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`ALTER TABLE "CampaignMetric" ADD COLUMN IF NOT EXISTS "platform" TEXT DEFAULT 'GOOGLE_ADS';`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "CampaignMetric_campaignRunId_date_key";`);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "CampaignMetric_campaignRunId_date_platform_key" ON "CampaignMetric"("campaignRunId", "date", "platform");
    `);

    // Check if tables exist now
    const result: any = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "Campaign"');
    const campaignCount = result?.[0]?.count ?? 0;

    return NextResponse.json({
      status: 'success',
      message: 'Tables created successfully (including CampaignMetric)',
      campaignCount
    });
  } catch (error: any) {
    console.error('Migration failed:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message
    }, { status: 500 });
  }
}

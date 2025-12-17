-- CreateTable
CREATE TABLE "Campaign" (
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

-- CreateTable
CREATE TABLE "CampaignRun" (
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

    CONSTRAINT "CampaignRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");

-- AddForeignKey
ALTER TABLE "CampaignRun" ADD CONSTRAINT "CampaignRun_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

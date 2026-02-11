CREATE TYPE "ContentRefreshWorkflowStatus" AS ENUM ('NEEDS_REFRESH', 'REFRESH_IN_PROGRESS', 'REFRESHED');
CREATE TYPE "ContentRefreshClassification" AS ENUM ('URGENT', 'MONITOR', 'HEALTHY');
CREATE TYPE "ContentRefreshHistoryType" AS ENUM ('DETECTION', 'STATUS_CHANGE', 'REFRESH_COMPLETED', 'BRIEF_GENERATED');

ALTER TABLE "Article"
    ADD COLUMN "refreshStatus" "ContentRefreshWorkflowStatus" NOT NULL DEFAULT 'REFRESHED',
    ADD COLUMN "refreshStatusUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "nextRefreshDueAt" TIMESTAMP(3);

CREATE TABLE "ContentRefreshSnapshot" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "periodCurrentStart" TIMESTAMP(3) NOT NULL,
    "periodCurrentEnd" TIMESTAMP(3) NOT NULL,
    "periodPreviousStart" TIMESTAMP(3) NOT NULL,
    "periodPreviousEnd" TIMESTAMP(3) NOT NULL,
    "currentClicks" INTEGER NOT NULL DEFAULT 0,
    "previousClicks" INTEGER NOT NULL DEFAULT 0,
    "currentImpressions" INTEGER NOT NULL DEFAULT 0,
    "previousImpressions" INTEGER NOT NULL DEFAULT 0,
    "currentAvgPosition" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "previousAvgPosition" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clicksDeltaPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressionsDeltaPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgPositionDelta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clickDeclining" BOOLEAN NOT NULL DEFAULT false,
    "impressionsDeclining" BOOLEAN NOT NULL DEFAULT false,
    "positionDeclining" BOOLEAN NOT NULL DEFAULT false,
    "classification" "ContentRefreshClassification" NOT NULL DEFAULT 'HEALTHY',
    "declineCount" INTEGER NOT NULL DEFAULT 0,
    "freshnessDays" INTEGER NOT NULL DEFAULT 0,
    "stale90" BOOLEAN NOT NULL DEFAULT false,
    "stale180" BOOLEAN NOT NULL DEFAULT false,
    "isTimeSensitive" BOOLEAN NOT NULL DEFAULT false,
    "timeSensitiveReasons" JSONB,
    "queryOpportunities" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentRefreshSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentRefreshBrief" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "briefMarkdown" TEXT NOT NULL,
    "recommendationsJson" JSONB NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContentRefreshBrief_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentRefreshHistory" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "eventType" "ContentRefreshHistoryType" NOT NULL,
    "fromStatus" "ContentRefreshWorkflowStatus",
    "toStatus" "ContentRefreshWorkflowStatus",
    "summary" TEXT NOT NULL,
    "details" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentRefreshHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentRefreshSnapshot_articleId_periodCurrentStart_periodCurrentEnd_key"
ON "ContentRefreshSnapshot"("articleId", "periodCurrentStart", "periodCurrentEnd");

CREATE INDEX "ContentRefreshSnapshot_classification_createdAt_idx"
ON "ContentRefreshSnapshot"("classification", "createdAt" DESC);

CREATE INDEX "ContentRefreshSnapshot_articleId_createdAt_idx"
ON "ContentRefreshSnapshot"("articleId", "createdAt" DESC);

CREATE INDEX "ContentRefreshBrief_articleId_createdAt_idx"
ON "ContentRefreshBrief"("articleId", "createdAt" DESC);

CREATE INDEX "ContentRefreshBrief_snapshotId_idx"
ON "ContentRefreshBrief"("snapshotId");

CREATE INDEX "ContentRefreshHistory_articleId_createdAt_idx"
ON "ContentRefreshHistory"("articleId", "createdAt" DESC);

CREATE INDEX "ContentRefreshHistory_eventType_createdAt_idx"
ON "ContentRefreshHistory"("eventType", "createdAt" DESC);

ALTER TABLE "ContentRefreshSnapshot"
    ADD CONSTRAINT "ContentRefreshSnapshot_articleId_fkey"
    FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentRefreshBrief"
    ADD CONSTRAINT "ContentRefreshBrief_articleId_fkey"
    FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentRefreshBrief"
    ADD CONSTRAINT "ContentRefreshBrief_snapshotId_fkey"
    FOREIGN KEY ("snapshotId") REFERENCES "ContentRefreshSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContentRefreshHistory"
    ADD CONSTRAINT "ContentRefreshHistory_articleId_fkey"
    FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

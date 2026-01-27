-- Add content scheduling and analytics tables

CREATE TABLE "ArticleMetric" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'GSC',
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleMetric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentSchedule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "cadence" TEXT NOT NULL DEFAULT 'DAILY',
    "runHour" INTEGER NOT NULL DEFAULT 8,
    "runMinute" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "options" JSONB,
    "maxDaily" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentJob" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "runAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "options" JSONB,
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentStrategy" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentStrategy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArticleMetric_articleId_date_source_key" ON "ArticleMetric"("articleId", "date", "source");
CREATE UNIQUE INDEX "ContentStrategy_key_key" ON "ContentStrategy"("key");

ALTER TABLE "ArticleMetric" ADD CONSTRAINT "ArticleMetric_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentJob" ADD CONSTRAINT "ContentJob_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ContentSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

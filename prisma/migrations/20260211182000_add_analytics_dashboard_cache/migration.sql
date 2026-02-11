CREATE TABLE "SearchConsoleDailySummary" (
    "id" TEXT NOT NULL,
    "metricDate" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SearchConsoleDailySummary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SearchConsolePageQueryDaily" (
    "id" TEXT NOT NULL,
    "metricDate" TIMESTAMP(3) NOT NULL,
    "page" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SearchConsolePageQueryDaily_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalyticsTrafficDaily" (
    "id" TEXT NOT NULL,
    "metricDate" TIMESTAMP(3) NOT NULL,
    "pagePath" TEXT NOT NULL,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "avgEngagementSec" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'NATIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnalyticsTrafficDaily_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiOverviewObservation" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "dateSpotted" TIMESTAMP(3) NOT NULL,
    "positionInOverview" INTEGER,
    "screenshotUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiOverviewObservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SearchConsoleDailySummary_metricDate_key" ON "SearchConsoleDailySummary"("metricDate");

CREATE UNIQUE INDEX "SearchConsolePageQueryDaily_metricDate_page_query_key"
ON "SearchConsolePageQueryDaily"("metricDate", "page", "query");

CREATE UNIQUE INDEX "AnalyticsTrafficDaily_metricDate_pagePath_source_key"
ON "AnalyticsTrafficDaily"("metricDate", "pagePath", "source");

CREATE INDEX "SearchConsoleDailySummary_metricDate_idx" ON "SearchConsoleDailySummary"("metricDate");
CREATE INDEX "SearchConsolePageQueryDaily_metricDate_page_idx" ON "SearchConsolePageQueryDaily"("metricDate", "page");
CREATE INDEX "SearchConsolePageQueryDaily_metricDate_query_idx" ON "SearchConsolePageQueryDaily"("metricDate", "query");
CREATE INDEX "SearchConsolePageQueryDaily_page_metricDate_idx" ON "SearchConsolePageQueryDaily"("page", "metricDate");
CREATE INDEX "SearchConsolePageQueryDaily_query_metricDate_idx" ON "SearchConsolePageQueryDaily"("query", "metricDate");
CREATE INDEX "AnalyticsTrafficDaily_metricDate_source_idx" ON "AnalyticsTrafficDaily"("metricDate", "source");
CREATE INDEX "AnalyticsTrafficDaily_pagePath_metricDate_idx" ON "AnalyticsTrafficDaily"("pagePath", "metricDate");
CREATE INDEX "AiOverviewObservation_dateSpotted_idx" ON "AiOverviewObservation"("dateSpotted");
CREATE INDEX "AiOverviewObservation_query_idx" ON "AiOverviewObservation"("query");

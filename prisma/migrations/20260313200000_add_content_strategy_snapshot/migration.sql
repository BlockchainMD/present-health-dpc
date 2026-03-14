-- CreateTable
CREATE TABLE "ContentStrategySnapshot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "windowDays" INTEGER NOT NULL,
    "avgCtr" DOUBLE PRECISION,
    "totalClicks" INTEGER,
    "totalImpressions" INTEGER,
    "clusterWeights" JSONB NOT NULL,
    "angleWeights" JSONB NOT NULL,
    "intentWeights" JSONB NOT NULL,

    CONSTRAINT "ContentStrategySnapshot_pkey" PRIMARY KEY ("id")
);

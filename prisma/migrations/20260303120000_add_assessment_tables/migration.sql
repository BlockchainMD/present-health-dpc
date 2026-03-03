-- CreateTable
CREATE TABLE "AssessmentSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "cluster" TEXT,
    "articleId" TEXT,
    "articleSlug" TEXT,
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "answers" JSONB NOT NULL DEFAULT '{}',
    "signals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiSummary" TEXT,
    "doctorFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendedSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "email" TEXT,
    "firstName" TEXT,
    "leadId" TEXT,
    "profileId" TEXT,
    "completedAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthProfile" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "leadId" TEXT,
    "signals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activeClusters" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sessionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentSession_token_key" ON "AssessmentSession"("token");

-- CreateIndex
CREATE INDEX "AssessmentSession_token_idx" ON "AssessmentSession"("token");

-- CreateIndex
CREATE INDEX "AssessmentSession_email_idx" ON "AssessmentSession"("email");

-- CreateIndex
CREATE INDEX "AssessmentSession_cluster_createdAt_idx" ON "AssessmentSession"("cluster", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AssessmentSession_status_createdAt_idx" ON "AssessmentSession"("status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "HealthProfile_token_key" ON "HealthProfile"("token");

-- CreateIndex
CREATE UNIQUE INDEX "HealthProfile_email_key" ON "HealthProfile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "HealthProfile_leadId_key" ON "HealthProfile"("leadId");

-- CreateIndex
CREATE INDEX "HealthProfile_email_idx" ON "HealthProfile"("email");

-- CreateIndex
CREATE INDEX "HealthProfile_token_idx" ON "HealthProfile"("token");

-- AddForeignKey
ALTER TABLE "AssessmentSession" ADD CONSTRAINT "AssessmentSession_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "HealthProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add ASSESSMENT to UnifiedLeadSource enum if not already present
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ASSESSMENT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UnifiedLeadSource')) THEN
        ALTER TYPE "UnifiedLeadSource" ADD VALUE 'ASSESSMENT';
    END IF;
END$$;

-- Add ASSESSMENT_LEAD to AutoResponseSource enum if not already present
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ASSESSMENT_LEAD' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AutoResponseSource')) THEN
        ALTER TYPE "AutoResponseSource" ADD VALUE 'ASSESSMENT_LEAD';
    END IF;
END$$;

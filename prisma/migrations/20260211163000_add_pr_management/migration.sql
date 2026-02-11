CREATE TYPE "PressReleaseStatus" AS ENUM ('DRAFT', 'APPROVED', 'SUBMITTED', 'PUBLISHED');

CREATE TYPE "PrOpportunityType" AS ENUM ('PODCAST', 'INTERVIEW', 'GUEST_POST', 'MEDIA_MENTION', 'AWARD');

CREATE TYPE "PrPitchStatus" AS ENUM ('IDENTIFIED', 'PITCHED', 'ACCEPTED', 'COMPLETED', 'DECLINED');

CREATE TYPE "PrMentionType" AS ENUM ('MEDIA_MENTION', 'BACKLINK', 'PODCAST_APPEARANCE', 'PRESS_RELEASE_PICKUP');

CREATE TABLE "PressRelease" (
    "id" TEXT NOT NULL,
    "headlineTopic" TEXT NOT NULL,
    "targetAngle" TEXT,
    "keyFacts" TEXT,
    "headline" TEXT NOT NULL,
    "subheadline" TEXT,
    "datelineCity" TEXT,
    "datelineDate" TIMESTAMP(3),
    "leadParagraph" TEXT,
    "body" TEXT NOT NULL,
    "physicianQuote" TEXT,
    "boilerplate" TEXT,
    "mediaContactName" TEXT,
    "mediaContactEmail" TEXT,
    "mediaContactPhone" TEXT,
    "status" "PressReleaseStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedOutlets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publishedUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scheduledFor" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "llmProvider" TEXT,
    "llmModel" TEXT,
    "llmPrompt" TEXT,
    "llmResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PressRelease_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrOpportunity" (
    "id" TEXT NOT NULL,
    "opportunityType" "PrOpportunityType" NOT NULL,
    "outletName" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "pitchStatus" "PrPitchStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "pitchText" TEXT,
    "resultUrl" TEXT,
    "date" TIMESTAMP(3),
    "notes" TEXT,
    "llmProvider" TEXT,
    "llmModel" TEXT,
    "llmPrompt" TEXT,
    "llmResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PrOpportunity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrMention" (
    "id" TEXT NOT NULL,
    "mentionType" "PrMentionType" NOT NULL DEFAULT 'MEDIA_MENTION',
    "title" TEXT NOT NULL,
    "sourceName" TEXT,
    "url" TEXT NOT NULL,
    "mentionDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "pressReleaseId" TEXT,
    "opportunityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PrMention_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrBoilerplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "aboutBoilerplate" TEXT NOT NULL,
    "physicianBioSnippets" JSONB,
    "mediaContactName" TEXT,
    "mediaContactEmail" TEXT,
    "mediaContactPhone" TEXT,
    "logoUrl" TEXT,
    "headshotUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PrBoilerplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PrBoilerplate_key_key" ON "PrBoilerplate"("key");

CREATE INDEX "PressRelease_status_scheduledFor_idx" ON "PressRelease"("status", "scheduledFor");

CREATE INDEX "PressRelease_datelineDate_createdAt_idx" ON "PressRelease"("datelineDate", "createdAt");

CREATE INDEX "PrOpportunity_pitchStatus_date_idx" ON "PrOpportunity"("pitchStatus", "date");

CREATE INDEX "PrOpportunity_opportunityType_date_idx" ON "PrOpportunity"("opportunityType", "date");

CREATE INDEX "PrMention_mentionDate_mentionType_idx" ON "PrMention"("mentionDate", "mentionType");

CREATE INDEX "PrMention_pressReleaseId_idx" ON "PrMention"("pressReleaseId");

CREATE INDEX "PrMention_opportunityId_idx" ON "PrMention"("opportunityId");

ALTER TABLE "PrMention" ADD CONSTRAINT "PrMention_pressReleaseId_fkey" FOREIGN KEY ("pressReleaseId") REFERENCES "PressRelease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PrMention" ADD CONSTRAINT "PrMention_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "PrOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

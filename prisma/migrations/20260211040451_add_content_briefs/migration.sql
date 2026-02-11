-- CreateEnum
CREATE TYPE "ContentBriefIntent" AS ENUM ('INFORMATIONAL', 'TRANSACTIONAL', 'COMMERCIAL', 'NAVIGATIONAL');

-- CreateEnum
CREATE TYPE "ContentBriefStatus" AS ENUM ('DRAFT', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "ContentBrief" (
    "id" TEXT NOT NULL,
    "targetKeyword" TEXT NOT NULL,
    "searchIntent" "ContentBriefIntent" NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "status" "ContentBriefStatus" NOT NULL DEFAULT 'DRAFT',
    "h1Options" JSONB NOT NULL,
    "metaTitleOptions" JSONB NOT NULL,
    "metaDescriptionOptions" JSONB NOT NULL,
    "urlSlugSuggestion" TEXT NOT NULL,
    "outline" JSONB NOT NULL,
    "semanticKeywords" JSONB NOT NULL,
    "longTailQuestions" JSONB NOT NULL,
    "faqSuggestions" JSONB NOT NULL,
    "differentiationAngle" TEXT NOT NULL,
    "recommendedWordCount" INTEGER NOT NULL,
    "schemaRecommendation" JSONB NOT NULL,
    "safetyFlags" JSONB,
    "safetyGlobalWarnings" JSONB,
    "disclaimerSuggestions" JSONB,
    "selectedH1" TEXT,
    "selectedMetaTitle" TEXT,
    "selectedMetaDescription" TEXT,
    "notes" TEXT,
    "internalLinkCatalog" JSONB,
    "generationPrompt" TEXT NOT NULL,
    "generationResponse" TEXT NOT NULL,
    "safetyPrompt" TEXT NOT NULL,
    "safetyResponse" TEXT NOT NULL,
    "convertedArticleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBrief_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentBrief_status_updatedAt_idx" ON "ContentBrief"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "ContentBrief_searchIntent_updatedAt_idx" ON "ContentBrief"("searchIntent", "updatedAt");

-- CreateIndex
CREATE INDEX "ContentBrief_targetKeyword_idx" ON "ContentBrief"("targetKeyword");

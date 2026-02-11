-- CreateEnum
CREATE TYPE "ContentSafetyReviewStatus" AS ENUM ('PASS', 'NEEDS_FIX', 'OVERRIDDEN');

-- CreateTable
CREATE TABLE "content_safety_reviews" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "status" "ContentSafetyReviewStatus" NOT NULL DEFAULT 'PASS',
    "contentHash" TEXT NOT NULL,
    "issueCount" INTEGER NOT NULL DEFAULT 0,
    "mustFixCount" INTEGER NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "suggestionCount" INTEGER NOT NULL DEFAULT 0,
    "unresolvedMustFixCount" INTEGER NOT NULL DEFAULT 0,
    "flags" JSONB NOT NULL,
    "overrideHistory" JSONB,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_safety_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_safety_reviews_articleId_createdAt_idx" ON "content_safety_reviews"("articleId", "createdAt");

-- CreateIndex
CREATE INDEX "content_safety_reviews_status_createdAt_idx" ON "content_safety_reviews"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "content_safety_reviews" ADD CONSTRAINT "content_safety_reviews_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "CitationCategory" AS ENUM ('CLINICAL', 'BRAND', 'BUSINESS', 'PRESS');

-- CreateEnum
CREATE TYPE "CitationStatus" AS ENUM ('ACTIVE', 'PENDING', 'NEEDS_UPDATE', 'NOT_LISTED');

-- CreateTable
CREATE TABLE "CitationDirectory" (
    "id" TEXT NOT NULL,
    "platformName" TEXT NOT NULL,
    "platformUrl" TEXT,
    "listingUrl" TEXT,
    "category" "CitationCategory" NOT NULL,
    "nameAsListed" TEXT,
    "addressAsListed" TEXT,
    "phoneAsListed" TEXT,
    "websiteAsListed" TEXT,
    "status" "CitationStatus" NOT NULL DEFAULT 'NOT_LISTED',
    "lastVerifiedDate" TIMESTAMP(3),
    "nextVerificationDate" TIMESTAMP(3),
    "reminderIntervalDays" INTEGER NOT NULL DEFAULT 90,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CitationDirectory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CitationDirectory_platformName_key" ON "CitationDirectory"("platformName");

-- CreateIndex
CREATE INDEX "CitationDirectory_status_updatedAt_idx" ON "CitationDirectory"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "CitationDirectory_category_platformName_idx" ON "CitationDirectory"("category", "platformName");

-- CreateIndex
CREATE INDEX "CitationDirectory_nextVerificationDate_idx" ON "CitationDirectory"("nextVerificationDate");

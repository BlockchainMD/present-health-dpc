-- CreateEnum
CREATE TYPE "ReviewPlatform" AS ENUM ('GOOGLE', 'YELP', 'HEALTHGRADES', 'ZOCDOC', 'FACEBOOK', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewResponseStatus" AS ENUM ('PENDING', 'DRAFTED', 'RESPONDED', 'SKIPPED');

-- CreateTable
CREATE TABLE "PublicReview" (
    "id" TEXT NOT NULL,
    "platform" "ReviewPlatform" NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "reviewText" TEXT NOT NULL,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "reviewUrl" TEXT,
    "responseStatus" "ReviewResponseStatus" NOT NULL DEFAULT 'PENDING',
    "responseText" TEXT,
    "responseApprovedAt" TIMESTAMP(3),
    "respondedDate" TIMESTAMP(3),
    "draftGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewRequestLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewRequestLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewRequestClick" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "platform" "ReviewPlatform" NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "ReviewRequestClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicReview_platform_reviewDate_idx" ON "PublicReview"("platform", "reviewDate");

-- CreateIndex
CREATE INDEX "PublicReview_responseStatus_reviewDate_idx" ON "PublicReview"("responseStatus", "reviewDate");

-- CreateIndex
CREATE INDEX "PublicReview_reviewDate_idx" ON "PublicReview"("reviewDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRequestLink_token_key" ON "ReviewRequestLink"("token");

-- CreateIndex
CREATE INDEX "ReviewRequestLink_isActive_createdAt_idx" ON "ReviewRequestLink"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewRequestClick_linkId_clickedAt_idx" ON "ReviewRequestClick"("linkId", "clickedAt");

-- CreateIndex
CREATE INDEX "ReviewRequestClick_platform_clickedAt_idx" ON "ReviewRequestClick"("platform", "clickedAt");

-- AddForeignKey
ALTER TABLE "ReviewRequestClick" ADD CONSTRAINT "ReviewRequestClick_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "ReviewRequestLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

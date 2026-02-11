-- CreateTable
CREATE TABLE "ContentRepurposeAsset" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "articleUrl" TEXT,
    "linkedinPost" TEXT,
    "xThread" TEXT,
    "shortVideoScript" TEXT,
    "newsletterSubjectOptions" JSONB,
    "newsletterSnippet" TEXT,
    "linkedinPublishedAt" TIMESTAMP(3),
    "xPublishedAt" TIMESTAMP(3),
    "videoPublishedAt" TIMESTAMP(3),
    "newsletterPublishedAt" TIMESTAMP(3),
    "lastGeneratedAt" TIMESTAMP(3),
    "generationLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentRepurposeAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentRepurposeAsset_articleId_key" ON "ContentRepurposeAsset"("articleId");

-- CreateIndex
CREATE INDEX "ContentRepurposeAsset_articleId_updatedAt_idx" ON "ContentRepurposeAsset"("articleId", "updatedAt");

-- CreateIndex
CREATE INDEX "ContentRepurposeAsset_lastGeneratedAt_idx" ON "ContentRepurposeAsset"("lastGeneratedAt");

-- AddForeignKey
ALTER TABLE "ContentRepurposeAsset" ADD CONSTRAINT "ContentRepurposeAsset_articleId_fkey"
FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

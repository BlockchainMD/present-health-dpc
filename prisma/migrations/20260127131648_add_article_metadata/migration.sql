-- Add metadata fields for scalable content engine
ALTER TABLE "Article" ADD COLUMN     "slug" TEXT;
ALTER TABLE "Article" ADD COLUMN     "excerpt" TEXT;
ALTER TABLE "Article" ADD COLUMN     "metaTitle" TEXT;
ALTER TABLE "Article" ADD COLUMN     "metaDescription" TEXT;
ALTER TABLE "Article" ADD COLUMN     "angle" TEXT;
ALTER TABLE "Article" ADD COLUMN     "intent" TEXT;
ALTER TABLE "Article" ADD COLUMN     "cluster" TEXT;
ALTER TABLE "Article" ADD COLUMN     "riskLevel" TEXT NOT NULL DEFAULT 'LOW';
ALTER TABLE "Article" ADD COLUMN     "briefJson" JSONB;
ALTER TABLE "Article" ADD COLUMN     "evidenceJson" JSONB;
ALTER TABLE "Article" ADD COLUMN     "contentHash" TEXT;
ALTER TABLE "Article" ADD COLUMN     "reviewedAt" TIMESTAMP(3);
ALTER TABLE "Article" ADD COLUMN     "reviewedByDisplayName" TEXT;
ALTER TABLE "Article" ADD COLUMN     "reviewType" TEXT NOT NULL DEFAULT 'CLINICAL';

CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "category" TEXT,
ADD COLUMN     "featuredImage" TEXT,
ADD COLUMN     "lastRefreshedAt" TIMESTAMP(3),
ADD COLUMN     "refreshRequested" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Article_status_publishedAt_idx" ON "Article"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Article_category_status_idx" ON "Article"("category", "status");

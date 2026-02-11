/*
  Warnings:

  - Added the required column `updatedAt` to the `EmployerInquiry` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EmployerInquiry" ADD COLUMN     "employeeCountRange" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'NEW',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "EmployerTestimonial" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "personName" TEXT,
    "personTitle" TEXT,
    "logoUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployerTestimonial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployerTestimonial_isActive_sortOrder_idx" ON "EmployerTestimonial"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "EmployerInquiry_status_submittedAt_idx" ON "EmployerInquiry"("status", "submittedAt");

-- CreateEnum
CREATE TYPE "UnifiedLeadSource" AS ENUM ('CHATBOT', 'EMPLOYER_INQUIRY', 'WAITLIST', 'CONTACT_FORM', 'MANUAL');

-- CreateEnum
CREATE TYPE "UnifiedLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CONSULTATION_SCHEDULED', 'ENROLLED', 'LOST');

-- CreateEnum
CREATE TYPE "UnifiedLeadMembershipTier" AS ENUM ('INDIVIDUAL', 'COUPLE', 'FAMILY', 'EMPLOYER', 'CUSTOM');

-- CreateTable
CREATE TABLE "UnifiedLead" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "state" TEXT,
    "source" "UnifiedLeadSource" NOT NULL,
    "sourcePage" TEXT,
    "status" "UnifiedLeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "assignedPhysicianId" TEXT,
    "membershipTier" "UnifiedLeadMembershipTier",
    "monthlyMembershipRate" INTEGER,
    "sourceRecordType" TEXT,
    "sourceRecordId" TEXT,
    "sourceMeta" JSONB,
    "statusUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enrolledAt" TIMESTAMP(3),
    "newLeadNotifiedAt" TIMESTAMP(3),
    "staleAlertSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnifiedLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnifiedLeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromStatus" "UnifiedLeadStatus",
    "toStatus" "UnifiedLeadStatus",
    "note" TEXT,
    "metadata" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnifiedLeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnifiedLead_status_statusUpdatedAt_idx" ON "UnifiedLead"("status", "statusUpdatedAt");

-- CreateIndex
CREATE INDEX "UnifiedLead_source_createdAt_idx" ON "UnifiedLead"("source", "createdAt");

-- CreateIndex
CREATE INDEX "UnifiedLead_email_createdAt_idx" ON "UnifiedLead"("email", "createdAt");

-- CreateIndex
CREATE INDEX "UnifiedLead_state_createdAt_idx" ON "UnifiedLead"("state", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UnifiedLead_source_sourceRecordId_key" ON "UnifiedLead"("source", "sourceRecordId");

-- CreateIndex
CREATE INDEX "UnifiedLeadActivity_leadId_createdAt_idx" ON "UnifiedLeadActivity"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "UnifiedLeadActivity_type_createdAt_idx" ON "UnifiedLeadActivity"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "UnifiedLead" ADD CONSTRAINT "UnifiedLead_assignedPhysicianId_fkey" FOREIGN KEY ("assignedPhysicianId") REFERENCES "Physician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiedLeadActivity" ADD CONSTRAINT "UnifiedLeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "UnifiedLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiedLeadActivity" ADD CONSTRAINT "UnifiedLeadActivity_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

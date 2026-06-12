CREATE TYPE "AutoResponseSequenceStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'STOPPED');

ALTER TABLE "AutoResponseEmailLog"
    ADD COLUMN "nurtureSequenceId" TEXT,
    ADD COLUMN "nurtureStep" INTEGER;

CREATE TABLE "AutoResponseNurtureSequence" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "AutoResponseSequenceStatus" NOT NULL DEFAULT 'ACTIVE',
    "step" INTEGER NOT NULL DEFAULT 1,
    "scheduledAt" TIMESTAMP(3),
    "source" "AutoResponseSource" NOT NULL,
    "leadRefType" TEXT,
    "leadRefId" TEXT,
    "recipientFirstName" TEXT,
    "state" TEXT,
    "sourcePage" TEXT,
    "lastEmailLogId" TEXT,
    "completedAt" TIMESTAMP(3),
    "stoppedAt" TIMESTAMP(3),
    "stopReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutoResponseNurtureSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutoResponseNurtureSequence_email_key" ON "AutoResponseNurtureSequence"("email");
CREATE INDEX "AutoResponseNurtureSequence_status_scheduledAt_idx" ON "AutoResponseNurtureSequence"("status", "scheduledAt");
CREATE INDEX "AutoResponseNurtureSequence_source_createdAt_idx" ON "AutoResponseNurtureSequence"("source", "createdAt" DESC);
CREATE INDEX "AutoResponseNurtureSequence_email_idx" ON "AutoResponseNurtureSequence"("email");
CREATE INDEX "AutoResponseEmailLog_nurtureSequenceId_idx" ON "AutoResponseEmailLog"("nurtureSequenceId");
CREATE UNIQUE INDEX "AutoResponseEmailLog_nurtureSequenceId_nurtureStep_key" ON "AutoResponseEmailLog"("nurtureSequenceId", "nurtureStep");

ALTER TABLE "AutoResponseEmailLog"
    ADD CONSTRAINT "AutoResponseEmailLog_nurtureSequenceId_fkey"
    FOREIGN KEY ("nurtureSequenceId") REFERENCES "AutoResponseNurtureSequence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

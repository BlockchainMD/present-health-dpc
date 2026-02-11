CREATE TYPE "AutoResponseSource" AS ENUM ('GENERAL_CONTACT', 'CHATBOT_LEAD', 'EMPLOYER_INQUIRY', 'STATE_WAITLIST');
CREATE TYPE "AutoResponseStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED', 'UNSUBSCRIBED');

CREATE TABLE "AutoResponseTemplate" (
    "id" TEXT NOT NULL,
    "source" "AutoResponseSource" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "subjectTemplate" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "followUpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "followUpDelayHours" INTEGER NOT NULL DEFAULT 72,
    "followUpSubjectTemplate" TEXT,
    "followUpBodyTemplate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutoResponseTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutoResponseEmailLog" (
    "id" TEXT NOT NULL,
    "source" "AutoResponseSource" NOT NULL,
    "status" "AutoResponseStatus" NOT NULL DEFAULT 'PENDING',
    "leadRefType" TEXT,
    "leadRefId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "recipientFirstName" TEXT,
    "subject" TEXT,
    "bodyText" TEXT,
    "bodyHtml" TEXT,
    "templateData" JSONB,
    "provider" TEXT,
    "providerMessageId" TEXT,
    "unsubscribeTokenHash" TEXT,
    "errorMessage" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "isFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "parentEmailId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutoResponseEmailLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutoResponseUnsubscribe" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" "AutoResponseSource",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutoResponseUnsubscribe_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutoResponseTemplate_source_key" ON "AutoResponseTemplate"("source");
CREATE INDEX "AutoResponseEmailLog_status_scheduledFor_idx" ON "AutoResponseEmailLog"("status", "scheduledFor");
CREATE INDEX "AutoResponseEmailLog_source_createdAt_idx" ON "AutoResponseEmailLog"("source", "createdAt" DESC);
CREATE INDEX "AutoResponseEmailLog_recipientEmail_createdAt_idx" ON "AutoResponseEmailLog"("recipientEmail", "createdAt" DESC);
CREATE INDEX "AutoResponseEmailLog_leadRefType_leadRefId_idx" ON "AutoResponseEmailLog"("leadRefType", "leadRefId");
CREATE INDEX "AutoResponseEmailLog_parentEmailId_idx" ON "AutoResponseEmailLog"("parentEmailId");
CREATE UNIQUE INDEX "AutoResponseUnsubscribe_email_source_key" ON "AutoResponseUnsubscribe"("email", "source");
CREATE INDEX "AutoResponseUnsubscribe_email_idx" ON "AutoResponseUnsubscribe"("email");

ALTER TABLE "AutoResponseEmailLog"
    ADD CONSTRAINT "AutoResponseEmailLog_parentEmailId_fkey"
    FOREIGN KEY ("parentEmailId") REFERENCES "AutoResponseEmailLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

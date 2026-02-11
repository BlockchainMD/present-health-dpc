CREATE TYPE "EmployerProspectSource" AS ENUM ('MANUAL', 'INBOUND', 'AI_RESEARCHED');

CREATE TYPE "EmployerProspectStatus" AS ENUM (
    'PROSPECT',
    'CONTACTED',
    'MEETING_SCHEDULED',
    'PROPOSAL_SENT',
    'NEGOTIATING',
    'WON',
    'LOST'
);

CREATE TABLE "EmployerProspect" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "industry" TEXT,
    "estimatedEmployees" INTEGER,
    "locationState" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactTitle" TEXT,
    "source" "EmployerProspectSource" NOT NULL DEFAULT 'MANUAL',
    "status" "EmployerProspectStatus" NOT NULL DEFAULT 'PROSPECT',
    "lastContactDate" TIMESTAMP(3),
    "nextFollowUpDate" TIMESTAMP(3),
    "notes" TEXT,
    "dealValueEstimate" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployerProspect_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmployerProspect_status_updatedAt_idx" ON "EmployerProspect"("status", "updatedAt");
CREATE INDEX "EmployerProspect_nextFollowUpDate_status_idx" ON "EmployerProspect"("nextFollowUpDate", "status");
CREATE INDEX "EmployerProspect_source_createdAt_idx" ON "EmployerProspect"("source", "createdAt");
CREATE INDEX "EmployerProspect_companyName_idx" ON "EmployerProspect"("companyName");

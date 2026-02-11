-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "authorPhysicianId" TEXT,
ADD COLUMN     "faqs" JSONB,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "schemaType" TEXT;

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "geoStates" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "layoutType" TEXT NOT NULL DEFAULT 'CONVERSION',
ADD COLUMN     "strategy" TEXT NOT NULL DEFAULT 'TRANSACTIONAL';

-- AlterTable
ALTER TABLE "CampaignRun" ADD COLUMN     "artifacts" JSONB,
ADD COLUMN     "educationalContent" TEXT,
ADD COLUMN     "googleAdGroupId" TEXT,
ADD COLUMN     "googleCampaignId" TEXT,
ADD COLUMN     "googleCustomerId" TEXT,
ADD COLUMN     "googleResourceName" TEXT,
ADD COLUMN     "googleSyncStatus" TEXT,
ADD COLUMN     "indexing" TEXT NOT NULL DEFAULT 'NOINDEX',
ADD COLUMN     "metaAdSetId" TEXT,
ADD COLUMN     "metaAdsResourceIds" JSONB,
ADD COLUMN     "metaCampaignId" TEXT,
ADD COLUMN     "metaSyncStatus" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "attributionSessionId" TEXT,
ADD COLUMN     "leadId" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "Physician" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "credentials" TEXT,
    "boardCertification" TEXT,
    "bio" TEXT,
    "photoUrl" TEXT,
    "statesLicensed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "npiNumber" TEXT,
    "yearsExperience" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Physician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "State" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "telehealthRegulationsSummary" TEXT,
    "rxLogistics" TEXT,
    "labOptions" TEXT,
    "emergencyProtocol" TEXT,
    "faqs" JSONB,
    "hsaNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployerInquiry" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "employeeCount" INTEGER,
    "message" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployerInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMetric" (
    "id" TEXT NOT NULL,
    "campaignRunId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'GOOGLE_ADS',
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "campaignRunId" TEXT NOT NULL,
    "email" TEXT,
    "gclid" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributionSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gclid" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "landingPath" TEXT NOT NULL,
    "referrer" TEXT,
    "userAgentHash" TEXT,
    "ipHash" TEXT,
    "leadId" TEXT,

    CONSTRAINT "AttributionSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversionEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "attributionSessionId" TEXT,
    "leadId" TEXT,
    "userId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ConversionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedAsset" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "campaignId" TEXT,
    "campaignRunId" TEXT,
    "promptVersion" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "validation" JSONB,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,

    CONSTRAINT "GeneratedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stripeEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleAdsSyncCursor" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastSyncedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "error" TEXT,

    CONSTRAINT "GoogleAdsSyncCursor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Physician_slug_key" ON "Physician"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "State_slug_key" ON "State"("slug");

-- CreateIndex
CREATE INDEX "EmployerInquiry_email_idx" ON "EmployerInquiry"("email");

-- CreateIndex
CREATE INDEX "EmployerInquiry_submittedAt_idx" ON "EmployerInquiry"("submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMetric_campaignRunId_date_platform_key" ON "CampaignMetric"("campaignRunId", "date", "platform");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_gclid_idx" ON "Lead"("gclid");

-- CreateIndex
CREATE INDEX "AttributionSession_createdAt_idx" ON "AttributionSession"("createdAt");

-- CreateIndex
CREATE INDEX "AttributionSession_gclid_idx" ON "AttributionSession"("gclid");

-- CreateIndex
CREATE UNIQUE INDEX "StripeEvent_stripeEventId_key" ON "StripeEvent"("stripeEventId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAdsSyncCursor_accountId_key" ON "GoogleAdsSyncCursor"("accountId");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_authorPhysicianId_fkey" FOREIGN KEY ("authorPhysicianId") REFERENCES "Physician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMetric" ADD CONSTRAINT "CampaignMetric_campaignRunId_fkey" FOREIGN KEY ("campaignRunId") REFERENCES "CampaignRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_campaignRunId_fkey" FOREIGN KEY ("campaignRunId") REFERENCES "CampaignRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributionSession" ADD CONSTRAINT "AttributionSession_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversionEvent" ADD CONSTRAINT "ConversionEvent_attributionSessionId_fkey" FOREIGN KEY ("attributionSessionId") REFERENCES "AttributionSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversionEvent" ADD CONSTRAINT "ConversionEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversionEvent" ADD CONSTRAINT "ConversionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

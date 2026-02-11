-- CreateTable
CREATE TABLE "ChatbotLead" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "heardAboutUs" TEXT,
    "source" TEXT NOT NULL DEFAULT 'chatbot',
    "conversationSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotConversationLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "pagePath" TEXT,
    "userMessage" TEXT NOT NULL,
    "assistantMessage" TEXT NOT NULL,
    "isMedicalRedirect" BOOLEAN NOT NULL DEFAULT false,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatbotConversationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatbotLead_state_createdAt_idx" ON "ChatbotLead"("state", "createdAt");

-- CreateIndex
CREATE INDEX "ChatbotLead_createdAt_idx" ON "ChatbotLead"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatbotLead_email_source_key" ON "ChatbotLead"("email", "source");

-- CreateIndex
CREATE INDEX "ChatbotConversationLog_sessionId_createdAt_idx" ON "ChatbotConversationLog"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatbotConversationLog_createdAt_idx" ON "ChatbotConversationLog"("createdAt");

-- CreateIndex
CREATE INDEX "ChatbotConversationLog_leadId_idx" ON "ChatbotConversationLog"("leadId");

-- AddForeignKey
ALTER TABLE "ChatbotConversationLog" ADD CONSTRAINT "ChatbotConversationLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ChatbotLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

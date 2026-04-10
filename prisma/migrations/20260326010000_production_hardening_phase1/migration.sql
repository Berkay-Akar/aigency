-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'ENQUEUED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuthAuditEvent" AS ENUM ('GOOGLE_LINKED', 'GOOGLE_UNLINKED');

-- CreateEnum
CREATE TYPE "SocialConnectionStatus" AS ENUM ('ACTIVE', 'INVALID');

-- AlterTable
ALTER TABLE "ScheduledPost" ADD COLUMN "publishJobId" TEXT;

-- AlterTable
ALTER TABLE "SocialConnection"
  ADD COLUMN "status" "SocialConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "invalidAt" TIMESTAMP(3),
  ADD COLUMN "lastCheckedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OutboxJob" (
  "id" TEXT NOT NULL,
  "queue" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "dedupeKey" TEXT,
  "payload" JSONB NOT NULL,
  "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "enqueuedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutboxJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentCallbackReplay" (
  "id" TEXT NOT NULL,
  "replayKey" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "conversationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentCallbackReplay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "creditAmount" INTEGER NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "status" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'iyzico',
  "raw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceInvite" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'MEMBER',
  "tokenHash" TEXT NOT NULL,
  "invitedById" TEXT NOT NULL,
  "acceptedById" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAuditLog" (
  "id" TEXT NOT NULL,
  "eventType" "AuthAuditEvent" NOT NULL,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerSubject" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduledPost_publishJobId_idx" ON "ScheduledPost"("publishJobId");
CREATE UNIQUE INDEX "OutboxJob_dedupeKey_key" ON "OutboxJob"("dedupeKey");
CREATE INDEX "OutboxJob_status_runAt_idx" ON "OutboxJob"("status", "runAt");
CREATE UNIQUE INDEX "PaymentCallbackReplay_replayKey_key" ON "PaymentCallbackReplay"("replayKey");
CREATE INDEX "PaymentCallbackReplay_expiresAt_idx" ON "PaymentCallbackReplay"("expiresAt");
CREATE UNIQUE INDEX "PaymentTransaction_conversationId_key" ON "PaymentTransaction"("conversationId");
CREATE INDEX "PaymentTransaction_workspaceId_createdAt_idx" ON "PaymentTransaction"("workspaceId", "createdAt");
CREATE UNIQUE INDEX "WorkspaceInvite_tokenHash_key" ON "WorkspaceInvite"("tokenHash");
CREATE INDEX "WorkspaceInvite_workspaceId_email_idx" ON "WorkspaceInvite"("workspaceId", "email");
CREATE INDEX "WorkspaceInvite_expiresAt_consumedAt_idx" ON "WorkspaceInvite"("expiresAt", "consumedAt");
CREATE INDEX "AuthAuditLog_eventType_createdAt_idx" ON "AuthAuditLog"("eventType", "createdAt");
CREATE INDEX "AuthAuditLog_email_createdAt_idx" ON "AuthAuditLog"("email", "createdAt");

-- AddForeignKey
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_acceptedById_fkey"
  FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuthAuditLog" ADD CONSTRAINT "AuthAuditLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migration: subscription_credits_discover
-- Adds: GenerationJobType, SubscriptionPlan, SubscriptionStatus, CreditLedgerType enums
--       jobType column on AiGenerationJob
--       Subscription, CreditLedger, DiscoverPost tables

-- ─── New enum types ───────────────────────────────────────────────────────────

CREATE TYPE "GenerationJobType" AS ENUM (
  'MODEL_PHOTO',
  'PRODUCT_STUDIO',
  'PRODUCT_SCENE_REFERENCE',
  'PRODUCT_SWAP',
  'GHOST_MANNEQUIN',
  'PHOTO_TO_VIDEO',
  'CUSTOM'
);

CREATE TYPE "SubscriptionPlan" AS ENUM (
  'FREE',
  'STARTER',
  'PRO',
  'ENTERPRISE'
);

CREATE TYPE "SubscriptionStatus" AS ENUM (
  'ACTIVE',
  'TRIALING',
  'CANCELLED',
  'EXPIRED',
  'PAST_DUE'
);

CREATE TYPE "CreditLedgerType" AS ENUM (
  'PURCHASE',
  'GENERATION',
  'REFUND',
  'BONUS',
  'SUBSCRIPTION_GRANT',
  'ADMIN_ADJUSTMENT'
);

-- ─── AiGenerationJob — add jobType ───────────────────────────────────────────

ALTER TABLE "AiGenerationJob"
  ADD COLUMN "jobType" "GenerationJobType";

-- ─── Subscription table ───────────────────────────────────────────────────────

CREATE TABLE "Subscription" (
  "id"                     TEXT NOT NULL,
  "workspaceId"            TEXT NOT NULL,
  "plan"                   "SubscriptionPlan" NOT NULL,
  "status"                 "SubscriptionStatus" NOT NULL,
  "monthlyCredits"         INTEGER NOT NULL,
  "currentPeriodStart"     TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd"       TIMESTAMP(3) NOT NULL,
  "trialEndsAt"            TIMESTAMP(3),
  "cancelledAt"            TIMESTAMP(3),
  "providerPlanId"         TEXT,
  "providerSubscriptionId" TEXT,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subscription_workspaceId_key" ON "Subscription"("workspaceId");
CREATE INDEX "Subscription_status_currentPeriodEnd_idx" ON "Subscription"("status", "currentPeriodEnd");

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── CreditLedger table ───────────────────────────────────────────────────────

CREATE TABLE "CreditLedger" (
  "id"          TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId"      TEXT,
  "amount"      INTEGER NOT NULL,
  "type"        "CreditLedgerType" NOT NULL,
  "description" TEXT,
  "referenceId" TEXT,
  "balanceAfter" INTEGER NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreditLedger_workspaceId_createdAt_idx" ON "CreditLedger"("workspaceId", "createdAt");
CREATE INDEX "CreditLedger_type_createdAt_idx" ON "CreditLedger"("type", "createdAt");

ALTER TABLE "CreditLedger"
  ADD CONSTRAINT "CreditLedger_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── DiscoverPost table ───────────────────────────────────────────────────────

CREATE TABLE "DiscoverPost" (
  "id"          TEXT NOT NULL,
  "assetId"     TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "jobType"     "GenerationJobType" NOT NULL,
  "imageUrl"    TEXT NOT NULL,
  "tags"        TEXT[] NOT NULL DEFAULT '{}',
  "isPublic"    BOOLEAN NOT NULL DEFAULT false,
  "isFeatured"  BOOLEAN NOT NULL DEFAULT false,
  "viewCount"   INTEGER NOT NULL DEFAULT 0,
  "likeCount"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DiscoverPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiscoverPost_assetId_key" ON "DiscoverPost"("assetId");
CREATE INDEX "DiscoverPost_isPublic_createdAt_idx" ON "DiscoverPost"("isPublic", "createdAt");
CREATE INDEX "DiscoverPost_isFeatured_idx" ON "DiscoverPost"("isFeatured");
CREATE INDEX "DiscoverPost_workspaceId_createdAt_idx" ON "DiscoverPost"("workspaceId", "createdAt");

ALTER TABLE "DiscoverPost"
  ADD CONSTRAINT "DiscoverPost_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DiscoverPost"
  ADD CONSTRAINT "DiscoverPost_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

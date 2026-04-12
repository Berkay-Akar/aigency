-- Initial schema baseline
-- This migration creates the base tables that existed before tracked migrations began.

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "Role" AS ENUM ('OWNER', 'MEMBER');
CREATE TYPE "Platform" AS ENUM ('INSTAGRAM', 'TIKTOK');
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED');

-- ─── Workspace ───────────────────────────────────────────────────────────────

CREATE TABLE "Workspace" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "slug"      TEXT NOT NULL,
    "ownerId"   TEXT NOT NULL,
    "credits"   INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
CREATE INDEX "Workspace_slug_idx" ON "Workspace"("slug");

-- ─── User ─────────────────────────────────────────────────────────────────────
-- Note: googleId added + passwordHash made nullable by migration 20260325200000

CREATE TABLE "User" (
    "id"                    TEXT NOT NULL,
    "email"                 TEXT NOT NULL,
    "passwordHash"          TEXT NOT NULL,
    "name"                  TEXT NOT NULL,
    "role"                  "Role" NOT NULL DEFAULT 'MEMBER',
    "workspaceId"           TEXT NOT NULL,
    "refreshToken"          TEXT,
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_workspaceId_idx" ON "User"("workspaceId");
CREATE INDEX "User_refreshToken_idx" ON "User"("refreshToken");

ALTER TABLE "User"
    ADD CONSTRAINT "User_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Asset ────────────────────────────────────────────────────────────────────

CREATE TABLE "Asset" (
    "id"          TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "jobId"       TEXT NOT NULL,
    "type"        TEXT NOT NULL,
    "url"         TEXT NOT NULL,
    "r2Key"       TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "caption"     TEXT NOT NULL,
    "hashtags"    TEXT[],
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Asset_jobId_key" ON "Asset"("jobId");
CREATE INDEX "Asset_workspaceId_idx" ON "Asset"("workspaceId");
CREATE INDEX "Asset_jobId_idx" ON "Asset"("jobId");

ALTER TABLE "Asset"
    ADD CONSTRAINT "Asset_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── SocialConnection ─────────────────────────────────────────────────────────
-- Note: status, invalidAt, lastCheckedAt added by migration 20260326010000

CREATE TABLE "SocialConnection" (
    "id"           TEXT NOT NULL,
    "workspaceId"  TEXT NOT NULL,
    "platform"     "Platform" NOT NULL,
    "accountId"    TEXT NOT NULL,
    "accountName"  TEXT NOT NULL,
    "accessToken"  TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt"    TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialConnection_workspaceId_platform_accountId_key"
    ON "SocialConnection"("workspaceId", "platform", "accountId");
CREATE INDEX "SocialConnection_workspaceId_platform_idx"
    ON "SocialConnection"("workspaceId", "platform");

ALTER TABLE "SocialConnection"
    ADD CONSTRAINT "SocialConnection_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── ScheduledPost ────────────────────────────────────────────────────────────
-- Note: publishJobId added by migration 20260326010000

CREATE TABLE "ScheduledPost" (
    "id"           TEXT NOT NULL,
    "workspaceId"  TEXT NOT NULL,
    "assetId"      TEXT NOT NULL,
    "platform"     "Platform" NOT NULL,
    "caption"      TEXT NOT NULL,
    "hashtags"     TEXT[],
    "scheduledAt"  TIMESTAMP(3) NOT NULL,
    "status"       "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "retryCount"   INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScheduledPost_workspaceId_idx" ON "ScheduledPost"("workspaceId");
CREATE INDEX "ScheduledPost_scheduledAt_status_idx" ON "ScheduledPost"("scheduledAt", "status");

ALTER TABLE "ScheduledPost"
    ADD CONSTRAINT "ScheduledPost_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScheduledPost"
    ADD CONSTRAINT "ScheduledPost_assetId_fkey"
    FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

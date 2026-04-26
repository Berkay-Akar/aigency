-- ─── BrandTone enum ──────────────────────────────────────────────────────────
CREATE TYPE "BrandTone" AS ENUM (
    'PROFESSIONAL',
    'LUXURY',
    'CASUAL',
    'BOLD',
    'MINIMALIST',
    'PLAYFUL'
);

-- ─── WorkspaceMember (User ↔ Workspace many-to-many) ─────────────────────────
CREATE TABLE "WorkspaceMember" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role"        "Role" NOT NULL DEFAULT 'MEMBER',
    "joinedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceMember_userId_workspaceId_key"
    ON "WorkspaceMember"("userId", "workspaceId");

CREATE INDEX "WorkspaceMember_userId_idx"      ON "WorkspaceMember"("userId");
CREATE INDEX "WorkspaceMember_workspaceId_idx" ON "WorkspaceMember"("workspaceId");

ALTER TABLE "WorkspaceMember"
    ADD CONSTRAINT "WorkspaceMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceMember"
    ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: backfill a WorkspaceMember row from every existing User row so that
-- existing accounts immediately work with multi-brand membership queries.
INSERT INTO "WorkspaceMember" ("id", "userId", "workspaceId", "role", "joinedAt")
SELECT
    gen_random_uuid()::TEXT,
    "id",
    "workspaceId",
    "role",
    "createdAt"
FROM "User"
ON CONFLICT ("userId", "workspaceId") DO NOTHING;

-- ─── BrandKit (1-to-1 with Workspace) ────────────────────────────────────────
CREATE TABLE "BrandKit" (
    "id"             TEXT NOT NULL,
    "workspaceId"    TEXT NOT NULL,
    "brandName"      TEXT,
    "tagline"        TEXT,
    "industry"       TEXT,
    "website"        TEXT,
    "description"    TEXT,
    "logoUrl"        TEXT,
    "primaryColor"   TEXT,
    "secondaryColor" TEXT,
    "accentColor"    TEXT,
    "tone"           "BrandTone",
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandKit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrandKit_workspaceId_key" ON "BrandKit"("workspaceId");

ALTER TABLE "BrandKit"
    ADD CONSTRAINT "BrandKit_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── User: add activeWorkspaceId ─────────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN "activeWorkspaceId" TEXT;

ALTER TABLE "User"
    ADD CONSTRAINT "User_activeWorkspaceId_fkey"
    FOREIGN KEY ("activeWorkspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── AiGenerationJob: add isDefaultPrompt ────────────────────────────────────
ALTER TABLE "AiGenerationJob"
    ADD COLUMN "isDefaultPrompt" BOOLEAN NOT NULL DEFAULT true;

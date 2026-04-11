-- CreateEnum
CREATE TYPE "GenerationJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "AiGenerationJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "modelTier" TEXT NOT NULL,
    "falModelId" TEXT,
    "modelId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "enhancePrompt" BOOLEAN NOT NULL DEFAULT false,
    "promptFinal" TEXT,
    "aspectRatio" TEXT NOT NULL,
    "customWidth" INTEGER,
    "customHeight" INTEGER,
    "outputFormat" TEXT NOT NULL,
    "imageUrls" JSONB NOT NULL,
    "duration" INTEGER,
    "platform" TEXT,
    "tone" TEXT,
    "creditsCost" INTEGER NOT NULL,
    "status" "GenerationJobStatus" NOT NULL DEFAULT 'QUEUED',
    "errorMessage" TEXT,
    "resultUrl" TEXT,
    "storageKey" TEXT,
    "storageProvider" TEXT NOT NULL DEFAULT 'cloudinary',
    "falResultUrl" TEXT,
    "assetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AiGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiGenerationJob_assetId_key" ON "AiGenerationJob"("assetId");

CREATE INDEX "AiGenerationJob_workspaceId_createdAt_idx" ON "AiGenerationJob"("workspaceId", "createdAt");

CREATE INDEX "AiGenerationJob_status_idx" ON "AiGenerationJob"("status");

CREATE INDEX "AiGenerationJob_userId_idx" ON "AiGenerationJob"("userId");

-- AddForeignKey
ALTER TABLE "AiGenerationJob" ADD CONSTRAINT "AiGenerationJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

import { randomUUID } from "crypto";
import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { authenticate, getUser } from "../auth/auth.middleware";
import { ProductAnglesSchema } from "./product-angles.schema";
import { buildProductAnglePrompt } from "../../services/prompt-builder/product-prompt.service";
import { dispatchPendingOutboxJobs } from "../../services/queue";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../utils/response";
import { env } from "../../config/env";
import { resolveFinalModelId } from "../../config/models";
import { RESOLUTION_CONFIG } from "../../config/model-photo";

export async function productAnglesRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post(
    "/ai/product-angles",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = ProductAnglesSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(
          reply,
          parsed.error.errors[0]?.message ?? "Invalid input",
          400,
        );
      }

      const { sub: userId, workspaceId } = getUser(request);
      const data = parsed.data;

      const creditPerImage = RESOLUTION_CONFIG[data.resolution].creditsCost;
      const totalCredits = creditPerImage * data.count;
      const modelId = resolveFinalModelId("image-to-image", data.modelTier);

      const angleIndexes = Array.from({ length: data.count }, (_, i) => i) as (
        | 0
        | 1
        | 2
      )[];

      const jobs = angleIndexes.map((i) => ({
        jobId: randomUUID(),
        ...buildProductAnglePrompt(i, data.resolution, data.customPrompt),
      }));

      try {
        await prisma.$transaction(async (tx) => {
          const workspace = await tx.workspace.findUnique({
            where: { id: workspaceId },
            select: { credits: true },
          });
          if (!workspace) {
            throw Object.assign(new Error("Workspace not found"), {
              statusCode: 404,
            });
          }
          if (workspace.credits < totalCredits) {
            throw Object.assign(new Error("Insufficient credits"), {
              statusCode: 402,
            });
          }

          await tx.workspace.update({
            where: { id: workspaceId },
            data: { credits: { decrement: totalCredits } },
          });

          for (const job of jobs) {
            await tx.aiGenerationJob.create({
              data: {
                id: job.jobId,
                workspaceId,
                userId,
                mode: "image-to-image",
                modelTier: data.modelTier,
                modelId,
                prompt: job.prompt,
                enhancePrompt: false,
                aspectRatio: job.aspectRatio,
                customWidth: job.width,
                customHeight: job.height,
                outputFormat: data.outputFormat,
                imageUrls: [data.productImageUrl] as Prisma.InputJsonValue,
                jobType: "PRODUCT_STUDIO" as const,
                creditsCost: creditPerImage,
                storageProvider: env.STORAGE_PROVIDER,
              },
            });

            await tx.outboxJob.create({
              data: {
                queue: "ai-jobs",
                name: "generate",
                dedupeKey: `ai-generate:${job.jobId}`,
                payload: {
                  jobId: job.jobId,
                  workspaceId,
                  userId,
                  mode: "image-to-image",
                  modelTier: data.modelTier,
                  modelId,
                  prompt: job.prompt,
                  enhancePrompt: false,
                  aspectRatio: job.aspectRatio,
                  customWidth: job.width,
                  customHeight: job.height,
                  outputFormat: data.outputFormat,
                  imageUrls: [data.productImageUrl],
                  duration: null,
                  platform: null,
                  tone: null,
                },
              },
            });
          }
        });
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        return sendError(reply, error.message, error.statusCode ?? 402);
      }

      try {
        await dispatchPendingOutboxJobs(20);
        return sendSuccess(
          reply,
          {
            jobIds: jobs.map((j) => j.jobId),
            status: "queued",
            totalCredits,
            modelId,
          },
          202,
        );
      } catch (err) {
        const error = err as Error;
        fastify.log.error({ err }, "Failed to enqueue product-angles jobs");
        return sendError(reply, error.message, 500);
      }
    },
  );
}

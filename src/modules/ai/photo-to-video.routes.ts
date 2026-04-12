import { randomUUID } from "crypto";
import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { authenticate, getUser } from "../auth/auth.middleware";
import { PhotoToVideoSchema } from "./photo-to-video.schema";
import { buildPhotoToVideoPrompt } from "../../services/prompt-builder/product-prompt.service";
import { dispatchPendingOutboxJobs } from "../../services/queue";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../utils/response";
import { env } from "../../config/env";
import { resolveFinalModelId } from "../../config/models";
import { VIDEO_DURATION_CREDITS } from "../../config/product-generation";

export async function photoToVideoRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post(
    "/ai/photo-to-video",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = PhotoToVideoSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(
          reply,
          parsed.error.errors[0]?.message ?? "Invalid input",
          400,
        );
      }

      const { sub: userId, workspaceId } = getUser(request);
      const data = parsed.data;

      const creditsCost = VIDEO_DURATION_CREDITS[data.duration];
      const { prompt, aspectRatio } = buildPhotoToVideoPrompt(
        data.platform,
        data.customPrompt,
      );
      const modelId = resolveFinalModelId("image-to-video", data.modelTier);
      const jobId = randomUUID();

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
          if (workspace.credits < creditsCost) {
            throw Object.assign(new Error("Insufficient credits"), {
              statusCode: 402,
            });
          }

          await tx.workspace.update({
            where: { id: workspaceId },
            data: { credits: { decrement: creditsCost } },
          });

          await tx.aiGenerationJob.create({
            data: {
              id: jobId,
              workspaceId,
              userId,
              mode: "image-to-video",
              modelTier: data.modelTier,
              modelId,
              prompt,
              enhancePrompt: false,
              aspectRatio,
              outputFormat: "mp4",
              imageUrls: [data.imageUrl] as Prisma.InputJsonValue,
              duration: data.duration,
              platform: data.platform,
              jobType: "PHOTO_TO_VIDEO",
              creditsCost,
              storageProvider: env.STORAGE_PROVIDER,
            },
          });

          await tx.outboxJob.create({
            data: {
              queue: "ai-jobs",
              name: "generate",
              dedupeKey: `ai-generate:${jobId}`,
              payload: {
                jobId,
                workspaceId,
                userId,
                mode: "image-to-video",
                modelTier: data.modelTier,
                modelId,
                prompt,
                enhancePrompt: false,
                aspectRatio,
                customWidth: null,
                customHeight: null,
                outputFormat: "mp4",
                imageUrls: [data.imageUrl],
                duration: data.duration,
                platform: data.platform,
                tone: null,
              },
            },
          });
        });
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        return sendError(reply, error.message, error.statusCode ?? 402);
      }

      try {
        await dispatchPendingOutboxJobs(20);
        return sendSuccess(
          reply,
          { jobId, status: "queued", creditsCost, modelId },
          202,
        );
      } catch (err) {
        const error = err as Error;
        fastify.log.error(
          { err, jobId },
          "Failed to enqueue photo-to-video job",
        );
        return sendError(reply, error.message, 500);
      }
    },
  );
}

import { randomUUID } from "crypto";
import type { FastifyInstance } from "fastify";
import { authenticate, getUser } from "../auth/auth.middleware";
import { createUploadMiddleware } from "./upload.middleware";
import { ModelPhotoSchema } from "./model-photo.schema";
import { buildModelPhotoPrompt } from "../../services/prompt-builder/model-photo-prompt.service";
import { buildModelPhotoBrandSuffix } from "../../services/prompt-builder/brand-kit-prompt.service";
import { dispatchPendingOutboxJobs } from "../../services/queue";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../utils/response";
import { env } from "../../config/env";
import { resolveFinalModelId } from "../../config/models";
import {
  MODEL_PHOTO_OPTIONS,
  RESOLUTION_CONFIG,
} from "../../config/model-photo";

export async function modelPhotoRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  // ─── GET /ai/model-photo/options ──────────────────────────────────────────
  // Returns all available enum options for the frontend to populate dropdowns.
  fastify.get(
    "/ai/model-photo/options",
    { preHandler: authenticate },
    async (_request, reply) => {
      return sendSuccess(reply, { options: MODEL_PHOTO_OPTIONS });
    },
  );

  // ─── POST /ai/model-photo ─────────────────────────────────────────────────
  // Accepts product image(s) + model/customization selections, builds a prompt
  // from enum values, and enqueues an image-to-image generation job.
  const uploadMiddleware = createUploadMiddleware([
    { name: "productImages", bodyKey: "productImageUrls", multiple: true },
  ]);

  fastify.post(
    "/ai/model-photo",
    { preHandler: [authenticate, uploadMiddleware] },
    async (request, reply) => {
      const parsed = ModelPhotoSchema.safeParse(request.body);

      if (!parsed.success) {
        return sendError(
          reply,
          parsed.error.errors[0]?.message ?? "Invalid input",
          400,
        );
      }

      const { sub: userId, workspaceId } = getUser(request);
      const data = parsed.data;

      const creditsCost = RESOLUTION_CONFIG[data.resolution].creditsCost;
      const {
        prompt: basePrompt,
        aspectRatio,
        width,
        height,
      } = buildModelPhotoPrompt(data);
      const brandSuffix = data.useBrandKit
        ? await prisma.brandKit
            .findUnique({ where: { workspaceId } })
            .then((kit) => (kit ? buildModelPhotoBrandSuffix(kit) : ""))
        : "";
      const prompt = `${basePrompt}${brandSuffix}`;
      const modelId = resolveFinalModelId("image-to-image", data.modelTier);
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
              mode: "image-to-image",
              modelTier: data.modelTier,
              modelId,
              prompt,
              enhancePrompt: false,
              aspectRatio,
              customWidth: width,
              customHeight: height,
              outputFormat: data.outputFormat,
              imageUrls: data.productImageUrls as Prisma.InputJsonValue,
              modelDetails:
                data.styleMode === "with-model"
                  ? (data.modelDetails as unknown as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
              customization:
                data.styleMode === "with-model"
                  ? (data.customization as unknown as Prisma.InputJsonValue)
                  : ({
                      shotType: data.shotType,
                    } as unknown as Prisma.InputJsonValue),
              jobType: "MODEL_PHOTO",
              creditsCost,
              isDefaultPrompt: !data.customPrompt,
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
                mode: "image-to-image",
                modelTier: data.modelTier,
                modelId,
                prompt,
                enhancePrompt: false,
                aspectRatio,
                customWidth: width,
                customHeight: height,
                outputFormat: data.outputFormat,
                imageUrls: data.productImageUrls,
                duration: null,
                platform: null,
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
        fastify.log.error({ err, jobId }, "Failed to enqueue model-photo job");
        return sendError(reply, error.message, 500);
      }
    },
  );
}

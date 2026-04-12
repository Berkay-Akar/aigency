import { randomUUID } from "crypto";
import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { authenticate, getUser } from "../auth/auth.middleware";
import { ProductReferenceSchema } from "./product-reference.schema";
import { buildProductReferencePrompt } from "../../services/prompt-builder/product-prompt.service";
import { dispatchPendingOutboxJobs } from "../../services/queue";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../utils/response";
import { env } from "../../config/env";
import { resolveFinalModelId } from "../../config/models";
import { RESOLUTION_CONFIG } from "../../config/model-photo";

export async function productReferenceRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post(
    "/ai/product-reference",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = ProductReferenceSchema.safeParse(request.body);
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
      const { prompt, width, height, aspectRatio } =
        buildProductReferencePrompt(
          data.styleMode,
          data.resolution,
          data.customPrompt,
        );
      const modelId = resolveFinalModelId("image-to-image", data.modelTier);
      const jobId = randomUUID();

      // Both product and reference are passed as imageUrls; the model uses both
      const imageUrls = [data.productImageUrl, data.referenceImageUrl];

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
              imageUrls: imageUrls as Prisma.InputJsonValue,
              customization: {
                styleMode: data.styleMode,
              } as unknown as Prisma.InputJsonValue,
              jobType: "PRODUCT_SCENE_REFERENCE",
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
                mode: "image-to-image",
                modelTier: data.modelTier,
                modelId,
                prompt,
                enhancePrompt: false,
                aspectRatio,
                customWidth: width,
                customHeight: height,
                outputFormat: data.outputFormat,
                imageUrls,
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
        fastify.log.error(
          { err, jobId },
          "Failed to enqueue product-reference job",
        );
        return sendError(reply, error.message, 500);
      }
    },
  );
}

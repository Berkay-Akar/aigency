import { randomUUID } from "crypto";
import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { authenticate, getUser } from "../auth/auth.middleware";
import { ProductSwapSchema } from "./product-swap.schema";
import { dispatchPendingOutboxJobs } from "../../services/queue";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../utils/response";
import { env } from "../../config/env";
import { resolveFinalModelId } from "../../config/models";
import { RESOLUTION_CONFIG } from "../../config/model-photo";

export async function productSwapRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post(
    "/ai/product-swap",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = ProductSwapSchema.safeParse(request.body);
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
      const modelId = resolveFinalModelId("image-to-image", data.modelTier);
      const jobId = randomUUID();

      // Product image first so the model knows which product to place in the scene
      const imageUrls = [data.productImageUrl, data.sceneImageUrl];

      const customExtra = data.customPrompt ? ` ${data.customPrompt}` : "";
      const prompt =
        `Replace the main product/object in the scene (second image) with the product shown ` +
        `in the first image. Preserve the exact composition, lighting, shadows, perspective ` +
        `and background. Only the product itself should change.${customExtra}`;

      const resConfig = RESOLUTION_CONFIG[data.resolution];
      // Swap scenes are typically square; use square dimensions
      const { width, height } = resConfig.square;
      const aspectRatio = "square";

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
              jobType: "PRODUCT_SWAP",
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

      await dispatchPendingOutboxJobs(20);

      return reply.code(202).send(
        sendSuccess(reply, {
          jobId,
          status: "queued",
          creditsCost,
          modelId,
        }),
      );
    },
  );
}

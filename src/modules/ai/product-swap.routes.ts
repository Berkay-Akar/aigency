import { randomUUID } from "crypto";
import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { authenticate, getUser } from "../auth/auth.middleware";
import { createUploadMiddleware } from "./upload.middleware";
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
  const uploadMiddleware = createUploadMiddleware([
    { name: "productImage", bodyKey: "productImageUrl" },
    { name: "sceneImage", bodyKey: "sceneImageUrl" },
  ]);

  fastify.post(
    "/ai/product-swap",
    { preHandler: [authenticate, uploadMiddleware] },
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
        `Use image 1 as the exact product reference. ` +
        `Use image 2 as the base scene and composition reference. ` +
        `Replace the existing product or object in image 2 with the exact product from image 1. ` +
        `Keep the pose, framing, camera angle, hand placement, body position, styling, background, lighting direction, and overall composition of image 2 as close as possible. ` +
        `Only swap the product. ` +
        `The product from image 1 must be preserved exactly as shown: same design, shape, proportions, materials, colors, pattern, texture, structure, hardware, and all visible details. ` +
        `Do not redesign, reinterpret, restyle, simplify, or approximate the product. ` +
        `Integrate the product naturally into image 2 with realistic scale, realistic perspective, realistic contact, realistic shadows, and realistic interaction with the person or environment. ` +
        `The final result must look like a real professional photograph, clean and believable. ` +
        `Do not change the person’s identity, face, body, clothing, pose, or background unless required for natural product placement. ` +
        `Do not generate a new scene. ` +
        `Do not create a different product or a similar version of the product. ` +
        `Do not alter the product color. ` +
        `Do not create a new product, a modified version, or a similar-looking replacement. ` +
        `Do not add extra accessories, extra objects, text, logo, watermark, or decorative elements. ` +
        `This is a precise product swap task: preserve image 2, replace only the product with image 1.${customExtra}`;

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

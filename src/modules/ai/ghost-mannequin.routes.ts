import { randomUUID } from "crypto";
import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { authenticate, getUser } from "../auth/auth.middleware";
import { GhostMannequinSchema } from "./ghost-mannequin.schema";
import { dispatchPendingOutboxJobs } from "../../services/queue";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../utils/response";
import { env } from "../../config/env";
import {
  GHOST_MANNEQUIN_FAL_MODELS,
  GHOST_MANNEQUIN_CREDIT_COST,
  buildGhostMannequinPrompt,
} from "../../config/ghost-mannequin";

export async function ghostMannequinRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post(
    "/ai/ghost-mannequin",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = GhostMannequinSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(
          reply,
          parsed.error.errors[0]?.message ?? "Invalid input",
          400,
        );
      }

      const { sub: userId, workspaceId } = getUser(request);
      const data = parsed.data;

      const creditsCost = GHOST_MANNEQUIN_CREDIT_COST[data.quality];
      const modelId = GHOST_MANNEQUIN_FAL_MODELS.ghostEdit;
      const jobId = randomUUID();

      const basePrompt = buildGhostMannequinPrompt(data.backgroundColor);
      const prompt = data.customPrompt
        ? `${basePrompt} ${data.customPrompt}`
        : basePrompt;

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
              // Uses a dedicated mode so the worker runs the correct flow
              mode: "ghost-mannequin",
              modelTier: data.quality,
              modelId,
              prompt,
              enhancePrompt: false,
              aspectRatio: "square",
              outputFormat: data.outputFormat,
              imageUrls: [data.productImageUrl] as Prisma.InputJsonValue,
              customization: {
                quality: data.quality,
                backgroundColor: data.backgroundColor,
              } as unknown as Prisma.InputJsonValue,
              jobType: "GHOST_MANNEQUIN",
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
                mode: "ghost-mannequin",
                modelTier: data.quality,
                modelId,
                prompt,
                enhancePrompt: false,
                aspectRatio: "square",
                outputFormat: data.outputFormat,
                imageUrls: [data.productImageUrl],
                duration: null,
                platform: null,
                tone: null,
                quality: data.quality,
                backgroundColor: data.backgroundColor,
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
          quality: data.quality,
        }),
      );
    },
  );
}

import { randomUUID } from "crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, getUser } from "../auth/auth.middleware";
import { GenerateSchema, EnhancePromptSchema } from "./ai.schema";
import { aiQueue, dispatchPendingOutboxJobs } from "../../services/queue";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../utils/response";
import { env } from "../../config/env";
import { resolveFinalModelId, listModelsByMode } from "../../config/models";
import { listPresetPrompts } from "../../config/preset-prompts";
import {
  enhanceGenerationPrompt,
  isOpenAiConfigured,
} from "../../services/prompt-builder";

const IMAGE_CREDIT_COST = 10;
const VIDEO_CREDIT_COST = 50;

const JobIdParamSchema = z.object({
  jobId: z.string().min(1),
});

const GenerationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function aiRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    "/ai/preset-prompts",
    { preHandler: authenticate },
    async (_request, reply) => {
      return sendSuccess(reply, { presets: listPresetPrompts() });
    },
  );

  fastify.get(
    "/ai/models",
    { preHandler: authenticate },
    async (_request, reply) => {
      return sendSuccess(reply, { models: listModelsByMode() });
    },
  );

  fastify.get(
    "/ai/generation-jobs",
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      const parsed = GenerationListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return sendError(
          reply,
          parsed.error.errors[0]?.message ?? "Invalid query",
          400,
        );
      }
      const { page, limit } = parsed.data;
      const skip = (page - 1) * limit;
      const [jobs, total] = await Promise.all([
        prisma.aiGenerationJob.findMany({
          where: { workspaceId },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.aiGenerationJob.count({ where: { workspaceId } }),
      ]);
      return sendSuccess(reply, {
        jobs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    },
  );

  fastify.post(
    "/ai/enhance-prompt",
    { preHandler: authenticate },
    async (request, reply) => {
      if (!isOpenAiConfigured()) {
        return sendError(
          reply,
          "OPENAI_API_KEY is not configured on the server",
          503,
        );
      }

      const parsed = EnhancePromptSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(
          reply,
          parsed.error.errors[0]?.message ?? "Invalid input",
          400,
        );
      }

      try {
        const enhancedPrompt = await enhanceGenerationPrompt(
          parsed.data.prompt,
          parsed.data.mode,
        );
        return sendSuccess(reply, { enhancedPrompt });
      } catch (err) {
        const error = err as Error;
        fastify.log.error({ err }, "enhance-prompt failed");
        return sendError(reply, error.message, 502);
      }
    },
  );

  fastify.post(
    "/ai/generate",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = GenerateSchema.safeParse(request.body);

      if (!parsed.success) {
        return sendError(
          reply,
          parsed.error.errors[0]?.message ?? "Invalid input",
          400,
        );
      }

      const { sub: userId, workspaceId } = getUser(request);
      const data = parsed.data;

      if (data.enhancePrompt && !isOpenAiConfigured()) {
        return sendError(
          reply,
          "OPENAI_API_KEY is not configured; disable enhancePrompt or configure OpenAI",
          503,
        );
      }

      const cost =
        data.mode === "image-to-video" ? VIDEO_CREDIT_COST : IMAGE_CREDIT_COST;

      const jobId = randomUUID();
      const modelId = resolveFinalModelId(
        data.mode,
        data.modelTier,
        data.falModelId,
      );

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
          if (workspace.credits < cost) {
            throw Object.assign(new Error("Insufficient credits"), {
              statusCode: 402,
            });
          }

          await tx.workspace.update({
            where: { id: workspaceId },
            data: { credits: { decrement: cost } },
          });

          await tx.aiGenerationJob.create({
            data: {
              id: jobId,
              workspaceId,
              userId,
              mode: data.mode,
              modelTier: data.modelTier,
              falModelId: data.falModelId ?? null,
              modelId,
              prompt: data.prompt,
              enhancePrompt: data.enhancePrompt,
              aspectRatio: data.aspectRatio,
              customWidth: data.customWidth,
              customHeight: data.customHeight,
              outputFormat: data.outputFormat,
              imageUrls: data.imageUrls as Prisma.InputJsonValue,
              duration: data.duration,
              platform: data.platform ?? null,
              tone: data.tone ?? null,
              jobType: "CUSTOM",
              creditsCost: cost,
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
                mode: data.mode,
                modelTier: data.modelTier,
                falModelId: data.falModelId,
                modelId,
                prompt: data.prompt,
                enhancePrompt: data.enhancePrompt,
                aspectRatio: data.aspectRatio,
                customWidth: data.customWidth,
                customHeight: data.customHeight,
                outputFormat: data.outputFormat,
                imageUrls: data.imageUrls,
                duration: data.duration,
                platform: data.platform,
                tone: data.tone,
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
          { jobId, status: "queued", creditsCost: cost, modelId },
          202,
        );
      } catch (err) {
        const error = err as Error;
        fastify.log.error({ err, jobId }, "Failed to enqueue AI job");
        return sendError(reply, error.message, 500);
      }
    },
  );

  fastify.get(
    "/jobs/:jobId",
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      const paramsParsed = JobIdParamSchema.safeParse(request.params);

      if (!paramsParsed.success) {
        return sendError(reply, "Invalid jobId", 400);
      }

      const { jobId } = paramsParsed.data;

      const job = await aiQueue.getJob(jobId);

      const generationJob = await prisma.aiGenerationJob.findFirst({
        where: { id: jobId, workspaceId },
      });

      if (!job) {
        const outbox = await prisma.outboxJob.findUnique({
          where: { dedupeKey: `ai-generate:${jobId}` },
        });

        if (!generationJob && !outbox) {
          return sendError(reply, "Job not found", 404);
        }

        if (outbox) {
          const payload = outbox.payload as { workspaceId?: string };
          if (payload.workspaceId !== workspaceId) {
            return sendError(reply, "Job not found", 404);
          }
        }

        let status: "queued" | "processing" | "completed" | "failed" = "queued";
        let failedReason: string | undefined;

        if (outbox?.status === "FAILED") {
          status = "failed";
          failedReason = outbox.lastError ?? undefined;
        }
        if (generationJob) {
          if (generationJob.status === "FAILED") {
            status = "failed";
            failedReason = generationJob.errorMessage ?? failedReason;
          } else if (generationJob.status === "COMPLETED") {
            status = "completed";
            failedReason = undefined;
          } else if (generationJob.status === "PROCESSING") {
            status = "processing";
          }
        }

        return sendSuccess(reply, {
          id: jobId,
          status,
          result:
            generationJob?.status === "COMPLETED" && generationJob.resultUrl
              ? {
                  url: generationJob.resultUrl,
                  assetId: generationJob.assetId ?? jobId,
                }
              : undefined,
          failedReason,
          generation: generationJob ?? undefined,
        });
      }

      const payload = job.data as { workspaceId?: string };
      if (payload.workspaceId !== workspaceId) {
        return sendError(reply, "Job not found", 404);
      }

      const state = await job.getState();

      const normalized =
        state === "waiting" || state === "delayed"
          ? "queued"
          : state === "active"
            ? "processing"
            : state === "completed"
              ? "completed"
              : "failed";

      const result =
        normalized === "completed" && job.returnvalue
          ? {
              url: (job.returnvalue as { assetUrl?: string }).assetUrl,
              assetId: (job.returnvalue as { assetId?: string }).assetId,
            }
          : undefined;

      const failedReason =
        normalized === "failed" ? job.failedReason : undefined;

      return sendSuccess(reply, {
        id: jobId,
        status: normalized,
        result,
        failedReason,
        generation: generationJob ?? undefined,
      });
    },
  );
}

import { randomUUID } from "crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, getUser } from "../auth/auth.middleware";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../utils/response";
import { uploadUserInputFile } from "../../services/storage";

const AssetIdParamSchema = z.object({
  id: z.string().min(1),
});

const AssetListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const JOB_SELECT = {
  id: true,
  mode: true,
  jobType: true,
  modelTier: true,
  modelId: true,
  falModelId: true,
  prompt: true,
  promptFinal: true,
  enhancePrompt: true,
  aspectRatio: true,
  customWidth: true,
  customHeight: true,
  outputFormat: true,
  imageUrls: true,
  duration: true,
  platform: true,
  tone: true,
  modelDetails: true,
  customization: true,
  creditsCost: true,
  status: true,
  isDefaultPrompt: true,
} as const;

export async function assetRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    "/assets",
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      const parsed = AssetListQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        return sendError(
          reply,
          parsed.error.errors[0]?.message ?? "Invalid query",
          400,
        );
      }

      const { page, limit } = parsed.data;
      const skip = (page - 1) * limit;

      const [assets, total] = await Promise.all([
        prisma.asset.findMany({
          where: { workspaceId },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.asset.count({ where: { workspaceId } }),
      ]);

      // Batch-fetch all linked generation jobs (no N+1)
      const jobIds = assets.map((a) => a.jobId).filter(Boolean);
      const jobs = jobIds.length
        ? await prisma.aiGenerationJob.findMany({
            where: { id: { in: jobIds } },
            select: JOB_SELECT,
          })
        : [];
      const jobMap = new Map(jobs.map((j) => [j.id, j]));

      const enrichedAssets = assets.map((asset) => {
        const job = jobMap.get(asset.jobId) ?? null;
        return {
          ...asset,
          generationJob: job
            ? {
                ...job,
                prompt: job.isDefaultPrompt ? null : job.prompt,
                promptFinal: job.isDefaultPrompt ? null : job.promptFinal,
              }
            : null,
        };
      });

      return sendSuccess(reply, {
        assets: enrichedAssets,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    },
  );

  fastify.get(
    "/assets/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      const paramsParsed = AssetIdParamSchema.safeParse(request.params);

      if (!paramsParsed.success) {
        return sendError(reply, "Invalid asset id", 400);
      }

      const asset = await prisma.asset.findFirst({
        where: { id: paramsParsed.data.id, workspaceId },
      });

      if (!asset) {
        return sendError(reply, "Asset not found", 404);
      }

      const generationJob = await prisma.aiGenerationJob.findUnique({
        where: { id: asset.jobId },
        select: JOB_SELECT,
      });

      return sendSuccess(reply, {
        asset: {
          ...asset,
          generationJob: generationJob
            ? {
                ...generationJob,
                prompt: generationJob.isDefaultPrompt
                  ? null
                  : generationJob.prompt,
                promptFinal: generationJob.isDefaultPrompt
                  ? null
                  : generationJob.promptFinal,
              }
            : null,
        },
      });
    },
  );

  fastify.post(
    "/assets/upload",
    { preHandler: authenticate },
    async (request, reply) => {
      const { sub: userId } = getUser(request);

      const data = await request.file({
        limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      });

      if (!data) {
        return sendError(reply, "No file uploaded", 400);
      }

      const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
      if (!ALLOWED_TYPES.includes(data.mimetype)) {
        return sendError(
          reply,
          "Only JPEG, PNG and WebP images are allowed",
          415,
        );
      }

      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      const uploaded = await uploadUserInputFile(
        userId,
        randomUUID(),
        buffer,
        data.mimetype,
      );

      return sendSuccess(reply, {
        url: uploaded.url,
        storageKey: uploaded.storageKey,
      });
    },
  );
}

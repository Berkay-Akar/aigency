import { randomUUID } from 'crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, getUser } from '../auth/auth.middleware';
import { GenerateSchema } from './ai.schema';
import { aiQueue, dispatchPendingOutboxJobs } from '../../services/queue';
import { prisma } from '../../lib/prisma';
import { sendSuccess, sendError } from '../../utils/response';

const IMAGE_CREDIT_COST = 10;
const VIDEO_CREDIT_COST = 50;

const JobIdParamSchema = z.object({
  jobId: z.string().min(1),
});

export async function aiRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/ai/generate',
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = GenerateSchema.safeParse(request.body);

      if (!parsed.success) {
        return sendError(reply, parsed.error.errors[0]?.message ?? 'Invalid input', 400);
      }

      const { sub: userId, workspaceId } = getUser(request);
      const { type, prompt, platform, style, targetAudience, tone, options } = parsed.data;

      const cost = type === 'image' ? IMAGE_CREDIT_COST : VIDEO_CREDIT_COST;

      const jobId = randomUUID();

      try {
        await prisma.$transaction(async (tx) => {
          const workspace = await tx.workspace.findUnique({
            where: { id: workspaceId },
            select: { credits: true },
          });

          if (!workspace) {
            throw Object.assign(new Error('Workspace not found'), { statusCode: 404 });
          }
          if (workspace.credits < cost) {
            throw Object.assign(new Error('Insufficient credits'), { statusCode: 402 });
          }

          await tx.workspace.update({
            where: { id: workspaceId },
            data: { credits: { decrement: cost } },
          });

          await tx.outboxJob.create({
            data: {
              queue: 'ai-jobs',
              name: 'generate',
              dedupeKey: `ai-generate:${jobId}`,
              payload: {
                jobId,
                workspaceId,
                userId,
                type,
                prompt,
                options: { platform, style, targetAudience, tone, ...options },
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
        return sendSuccess(reply, { jobId, status: 'queued', creditsCost: cost }, 202);
      } catch (err) {
        const error = err as Error;
        fastify.log.error({ err, jobId }, 'Failed to enqueue AI job');
        return sendError(reply, error.message, 500);
      }
    },
  );

  fastify.get(
    '/jobs/:jobId',
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      const paramsParsed = JobIdParamSchema.safeParse(request.params);

      if (!paramsParsed.success) {
        return sendError(reply, 'Invalid jobId', 400);
      }

      const { jobId } = paramsParsed.data;

      const job = await aiQueue.getJob(jobId);

      if (!job) {
        const outbox = await prisma.outboxJob.findUnique({
          where: { dedupeKey: `ai-generate:${jobId}` },
        });
        if (!outbox) {
          return sendError(reply, 'Job not found', 404);
        }
        const payload = outbox.payload as { workspaceId?: string };
        if (payload.workspaceId !== workspaceId) {
          return sendError(reply, 'Job not found', 404);
        }

        return sendSuccess(reply, {
          id: jobId,
          status: outbox.status === 'FAILED' ? 'failed' : 'queued',
          result: undefined,
          failedReason: outbox.lastError ?? undefined,
        });
      }

      // Verify this job belongs to the requesting workspace
      const payload = job.data as { workspaceId?: string };
      if (payload.workspaceId !== workspaceId) {
        return sendError(reply, 'Job not found', 404);
      }

      const state = await job.getState();

      const normalized =
        state === 'waiting' || state === 'delayed' ? 'queued'
        : state === 'active' ? 'processing'
        : state === 'completed' ? 'completed'
        : 'failed';

      const result =
        normalized === 'completed' && job.returnvalue
          ? { url: (job.returnvalue as { assetUrl?: string }).assetUrl, assetId: (job.returnvalue as { assetId?: string }).assetId }
          : undefined;

      const failedReason =
        normalized === 'failed' ? job.failedReason : undefined;

      return sendSuccess(reply, {
        id: jobId,
        status: normalized,
        result,
        failedReason,
      });
    },
  );
}

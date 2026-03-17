import { randomUUID } from 'crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, getUser } from '../auth/auth.middleware';
import { GenerateSchema } from './ai.schema';
import { addAiJob, aiQueue } from '../../services/queue';
import { deductCredits, refundCredits } from '../billing/billing.service';
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

      // Deduct credits before queuing — refund if enqueue fails
      try {
        await deductCredits(workspaceId, cost);
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        return sendError(reply, error.message, error.statusCode ?? 402);
      }

      const jobId = randomUUID();

      try {
        await addAiJob({
          jobId,
          workspaceId,
          userId,
          type,
          prompt,
          options: { platform, style, targetAudience, tone, ...options },
        });

        return sendSuccess(reply, { jobId, status: 'queued', creditsCost: cost }, 202);
      } catch (err) {
        // Enqueue failed — refund credits
        await refundCredits(workspaceId, cost).catch((refundErr: unknown) => {
          fastify.log.error({ refundErr, workspaceId, cost }, 'Credit refund failed after job enqueue failure');
        });

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
        return sendError(reply, 'Job not found', 404);
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

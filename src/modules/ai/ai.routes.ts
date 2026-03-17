import { randomUUID } from 'crypto';
import type { FastifyInstance } from 'fastify';
import { authenticate, getUser } from '../auth/auth.middleware';
import { GenerateSchema } from './ai.schema';
import { addAiJob } from '../../services/queue';
import { sendSuccess, sendError } from '../../utils/response';

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

        return sendSuccess(reply, { jobId, status: 'queued' }, 202);
      } catch (err) {
        const error = err as Error;
        fastify.log.error({ err, jobId }, 'Failed to enqueue AI job');
        return sendError(reply, error.message, 500);
      }
    },
  );
}

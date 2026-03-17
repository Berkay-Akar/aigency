import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../utils/response';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async (_request, reply) => {
    sendSuccess(reply, { status: 'ok', timestamp: new Date().toISOString() });
  });
}

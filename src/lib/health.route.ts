import type { FastifyInstance } from 'fastify';
import { prisma } from './prisma';
import { aiQueue } from '../services/queue';

async function probeDb(): Promise<'connected' | 'error'> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'connected';
  } catch {
    return 'error';
  }
}

async function probeQueue(): Promise<'working' | 'error'> {
  try {
    const client = await aiQueue.client;
    await client.ping();
    return 'working';
  } catch {
    return 'error';
  }
}

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async (_request, reply) => {
    const [db, queue] = await Promise.all([
      probeDb(),
      probeQueue(),
    ]);

    const healthy = db === 'connected' && queue === 'working';
    const status = healthy ? 'ok' : 'degraded';

    reply.status(healthy ? 200 : 503).send({
      success: healthy,
      data: {
        status,
        db,
        queue,
        timestamp: new Date().toISOString(),
      },
    });
  });
}

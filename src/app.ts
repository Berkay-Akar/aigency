import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env';
import { healthRoutes } from './lib/health.route';
import { authRoutes } from './modules/auth/auth.routes';
import { workspaceRoutes } from './modules/workspace/workspace.routes';
import { aiRoutes } from './modules/ai/ai.routes';
import { assetRoutes } from './modules/ai/asset.routes';
import { socialRoutes } from './modules/social/social.routes';
import { schedulerRoutes } from './modules/scheduler/scheduler.routes';
import { billingRoutes } from './modules/billing/billing.routes';

export function buildApp() {
  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  fastify.register(cors, {
    origin: env.APP_URL,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  fastify.register(sensible);

  fastify.register(jwt, {
    secret: env.JWT_SECRET,
  });

  fastify.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    keyGenerator: (request) => {
      const ua = request.headers['user-agent'] ?? 'unknown';
      return `${request.ip}:${ua}`;
    },
  });

  fastify.register(healthRoutes);
  fastify.register(authRoutes);
  fastify.register(workspaceRoutes);
  fastify.register(aiRoutes);
  fastify.register(assetRoutes);
  fastify.register(socialRoutes);
  fastify.register(schedulerRoutes);
  fastify.register(billingRoutes);

  return fastify;
}

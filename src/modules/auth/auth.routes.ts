import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RegisterSchema, LoginSchema } from './auth.schema';
import { register, login, rotateRefreshToken } from './auth.service';
import { sendSuccess, sendError } from '../../utils/response';

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/auth/register', async (request, reply) => {
    const parsed = RegisterSchema.safeParse(request.body);

    if (!parsed.success) {
      return sendError(reply, parsed.error.errors[0]?.message ?? 'Invalid input', 400);
    }

    try {
      const { user, payload, refreshToken } = await register(parsed.data);
      const token = fastify.jwt.sign(payload, {
        expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
      });

      return sendSuccess(reply, { token, refreshToken, user }, 201);
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      return sendError(reply, error.message, error.statusCode ?? 500);
    }
  });

  fastify.post('/auth/login', async (request, reply) => {
    const parsed = LoginSchema.safeParse(request.body);

    if (!parsed.success) {
      return sendError(reply, parsed.error.errors[0]?.message ?? 'Invalid input', 400);
    }

    try {
      const { user, payload, refreshToken } = await login(parsed.data);
      const token = fastify.jwt.sign(payload, {
        expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
      });

      return sendSuccess(reply, { token, refreshToken, user });
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      return sendError(reply, error.message, error.statusCode ?? 500);
    }
  });

  fastify.post('/auth/refresh', async (request, reply) => {
    const parsed = RefreshSchema.safeParse(request.body);

    if (!parsed.success) {
      return sendError(reply, 'refreshToken is required', 400);
    }

    try {
      const { user, payload, refreshToken } = await rotateRefreshToken(parsed.data.refreshToken);
      const token = fastify.jwt.sign(payload, {
        expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
      });

      return sendSuccess(reply, { token, refreshToken, user });
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      return sendError(reply, error.message, error.statusCode ?? 500);
    }
  });
}

import type { FastifyInstance } from 'fastify';
import { RegisterSchema, LoginSchema } from './auth.schema';
import { register, login } from './auth.service';
import { sendSuccess, sendError } from '../../utils/response';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/auth/register', async (request, reply) => {
    const parsed = RegisterSchema.safeParse(request.body);

    if (!parsed.success) {
      return sendError(reply, parsed.error.errors[0]?.message ?? 'Invalid input', 400);
    }

    try {
      const { user, payload } = await register(parsed.data);
      const token = fastify.jwt.sign(payload, {
        expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
      });

      return sendSuccess(reply, { token, user }, 201);
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      const statusCode = error.statusCode ?? 500;
      return sendError(reply, error.message, statusCode);
    }
  });

  fastify.post('/auth/login', async (request, reply) => {
    const parsed = LoginSchema.safeParse(request.body);

    if (!parsed.success) {
      return sendError(reply, parsed.error.errors[0]?.message ?? 'Invalid input', 400);
    }

    try {
      const { user, payload } = await login(parsed.data);
      const token = fastify.jwt.sign(payload, {
        expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
      });

      return sendSuccess(reply, { token, user });
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      const statusCode = error.statusCode ?? 500;
      return sendError(reply, error.message, statusCode);
    }
  });
}

import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RegisterSchema, LoginSchema } from './auth.schema';
import {
  register,
  login,
  rotateRefreshToken,
  authenticateWithGoogle,
} from './auth.service';
import { sendSuccess, sendError } from '../../utils/response';
import { isGoogleOAuthConfigured } from '../../config/env';
import {
  buildGoogleAuthorizationUrl,
  exchangeGoogleAuthorizationCode,
  fetchGoogleUserInfo,
} from '../../services/oauth';

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const GoogleCallbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/auth/google', async (_request, reply) => {
    if (!isGoogleOAuthConfigured()) {
      return sendError(
        reply,
        'Google OAuth is not configured (set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)',
        503,
      );
    }

    const state = fastify.jwt.sign(
      { purpose: 'google_oauth', nonce: randomUUID() },
      { expiresIn: '10m' },
    );
    const url = buildGoogleAuthorizationUrl(state);
    return reply.redirect(url);
  });

  fastify.get('/auth/google/callback', async (request, reply) => {
    if (!isGoogleOAuthConfigured()) {
      return sendError(
        reply,
        'Google OAuth is not configured (set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)',
        503,
      );
    }

    const parsed = GoogleCallbackQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      return sendError(reply, 'Invalid callback query', 400);
    }

    const q = parsed.data;

    if (q.error) {
      return sendError(
        reply,
        q.error_description ?? q.error ?? 'OAuth error',
        400,
      );
    }

    if (!q.code || !q.state) {
      return sendError(reply, 'Missing code or state', 400);
    }

    let statePayload: { purpose?: string };
    try {
      statePayload = fastify.jwt.verify(q.state) as { purpose?: string };
    } catch {
      return sendError(reply, 'Invalid or expired state', 400);
    }

    if (statePayload.purpose !== 'google_oauth') {
      return sendError(reply, 'Invalid state', 400);
    }

    try {
      const tokens = await exchangeGoogleAuthorizationCode(q.code);
      const profile = await fetchGoogleUserInfo(tokens.access_token);

      if (profile.email_verified === false) {
        return sendError(reply, 'Google email must be verified', 403);
      }

      if (!profile.email) {
        return sendError(reply, 'Google did not return an email', 400);
      }

      const { user, payload, refreshToken } = await authenticateWithGoogle({
        googleId: profile.sub,
        email: profile.email,
        name: profile.name || profile.email.split('@')[0] || 'User',
      });

      const token = fastify.jwt.sign(payload, {
        expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
      });

      return sendSuccess(reply, { token, refreshToken, user }, 200);
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      return sendError(reply, error.message, error.statusCode ?? 500);
    }
  });

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

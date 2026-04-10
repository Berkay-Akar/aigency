import type { FastifyInstance } from 'fastify';
import { authenticate, getUser } from '../auth/auth.middleware';
import { SchedulePostSchema, CalendarQuerySchema, PostIdParamSchema, PostsQuerySchema } from './scheduler.schema';
import {
  schedulePost,
  cancelPost,
  getPostsByWorkspacePaged,
  getPostsByDateRange,
} from '../../services/scheduler';
import { sendSuccess, sendError } from '../../utils/response';
import type { Platform } from '@prisma/client';

export async function schedulerRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/posts/schedule',
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      const parsed = SchedulePostSchema.safeParse(request.body);

      if (!parsed.success) {
        return sendError(reply, parsed.error.errors[0]?.message ?? 'Invalid input', 400);
      }

      try {
        const post = await schedulePost({
          workspaceId,
          assetId: parsed.data.assetId,
          platform: parsed.data.platform as Platform,
          caption: parsed.data.caption,
          hashtags: parsed.data.hashtags,
          scheduledAt: new Date(parsed.data.scheduledAt),
        });

        return sendSuccess(reply, { post }, 201);
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        return sendError(reply, error.message, error.statusCode ?? 500);
      }
    },
  );

  fastify.get(
    '/posts',
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      const parsed = PostsQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        return sendError(reply, parsed.error.errors[0]?.message ?? 'Invalid query', 400);
      }

      try {
        const { page, limit, status, from, to } = parsed.data;
        const result = await getPostsByWorkspacePaged(workspaceId, {
          page,
          limit,
          status,
          from: from ? new Date(from) : undefined,
          to: to ? new Date(to) : undefined,
        });
        return sendSuccess(reply, {
          posts: result.posts,
          pagination: {
            page,
            limit,
            total: result.total,
            pages: Math.ceil(result.total / limit),
          },
        });
      } catch (err) {
        const error = err as Error;
        return sendError(reply, error.message, 500);
      }
    },
  );

  fastify.delete(
    '/posts/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      const paramsParsed = PostIdParamSchema.safeParse(request.params);

      if (!paramsParsed.success) {
        return sendError(reply, 'Invalid post id', 400);
      }

      try {
        const post = await cancelPost(paramsParsed.data.id, workspaceId);
        return sendSuccess(reply, { post });
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        return sendError(reply, error.message, error.statusCode ?? 500);
      }
    },
  );

  fastify.get(
    '/posts/calendar',
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      const parsed = CalendarQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        return sendError(reply, 'from and to query params required (ISO datetime)', 400);
      }

      try {
        const posts = await getPostsByDateRange(
          workspaceId,
          new Date(parsed.data.from),
          new Date(parsed.data.to),
        );

        // Group by date string (YYYY-MM-DD)
        const grouped = posts.reduce<Record<string, typeof posts>>((acc, post) => {
          const day = post.scheduledAt.toISOString().slice(0, 10);
          if (!acc[day]) acc[day] = [];
          acc[day].push(post);
          return acc;
        }, {});

        return sendSuccess(reply, { calendar: grouped });
      } catch (err) {
        const error = err as Error;
        return sendError(reply, error.message, 500);
      }
    },
  );
}

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, getUser } from '../auth/auth.middleware';
import { prisma } from '../../lib/prisma';
import { sendSuccess, sendError } from '../../utils/response';

const AssetIdParamSchema = z.object({
  id: z.string().min(1),
});

const AssetListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function assetRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/assets',
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      const parsed = AssetListQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        return sendError(reply, parsed.error.errors[0]?.message ?? 'Invalid query', 400);
      }

      const { page, limit } = parsed.data;
      const skip = (page - 1) * limit;

      const [assets, total] = await Promise.all([
        prisma.asset.findMany({
          where: { workspaceId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.asset.count({ where: { workspaceId } }),
      ]);

      return sendSuccess(reply, {
        assets,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    },
  );

  fastify.get(
    '/assets/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      const paramsParsed = AssetIdParamSchema.safeParse(request.params);

      if (!paramsParsed.success) {
        return sendError(reply, 'Invalid asset id', 400);
      }

      const asset = await prisma.asset.findFirst({
        where: { id: paramsParsed.data.id, workspaceId },
      });

      if (!asset) {
        return sendError(reply, 'Asset not found', 404);
      }

      return sendSuccess(reply, { asset });
    },
  );
}

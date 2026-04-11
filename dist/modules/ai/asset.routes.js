"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetRoutes = assetRoutes;
const zod_1 = require("zod");
const auth_middleware_1 = require("../auth/auth.middleware");
const prisma_1 = require("../../lib/prisma");
const response_1 = require("../../utils/response");
const AssetIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
});
const AssetListQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
async function assetRoutes(fastify) {
    fastify.get('/assets', { preHandler: auth_middleware_1.authenticate }, async (request, reply) => {
        const { workspaceId } = (0, auth_middleware_1.getUser)(request);
        const parsed = AssetListQuerySchema.safeParse(request.query);
        if (!parsed.success) {
            return (0, response_1.sendError)(reply, parsed.error.errors[0]?.message ?? 'Invalid query', 400);
        }
        const { page, limit } = parsed.data;
        const skip = (page - 1) * limit;
        const [assets, total] = await Promise.all([
            prisma_1.prisma.asset.findMany({
                where: { workspaceId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.asset.count({ where: { workspaceId } }),
        ]);
        return (0, response_1.sendSuccess)(reply, {
            assets,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    });
    fastify.get('/assets/:id', { preHandler: auth_middleware_1.authenticate }, async (request, reply) => {
        const { workspaceId } = (0, auth_middleware_1.getUser)(request);
        const paramsParsed = AssetIdParamSchema.safeParse(request.params);
        if (!paramsParsed.success) {
            return (0, response_1.sendError)(reply, 'Invalid asset id', 400);
        }
        const asset = await prisma_1.prisma.asset.findFirst({
            where: { id: paramsParsed.data.id, workspaceId },
        });
        if (!asset) {
            return (0, response_1.sendError)(reply, 'Asset not found', 404);
        }
        return (0, response_1.sendSuccess)(reply, { asset });
    });
}
//# sourceMappingURL=asset.routes.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulerRoutes = schedulerRoutes;
const auth_middleware_1 = require("../auth/auth.middleware");
const scheduler_schema_1 = require("./scheduler.schema");
const scheduler_1 = require("../../services/scheduler");
const response_1 = require("../../utils/response");
async function schedulerRoutes(fastify) {
    fastify.post('/posts/schedule', { preHandler: auth_middleware_1.authenticate }, async (request, reply) => {
        const { workspaceId } = (0, auth_middleware_1.getUser)(request);
        const parsed = scheduler_schema_1.SchedulePostSchema.safeParse(request.body);
        if (!parsed.success) {
            return (0, response_1.sendError)(reply, parsed.error.errors[0]?.message ?? 'Invalid input', 400);
        }
        try {
            const post = await (0, scheduler_1.schedulePost)({
                workspaceId,
                assetId: parsed.data.assetId,
                platform: parsed.data.platform,
                caption: parsed.data.caption,
                hashtags: parsed.data.hashtags,
                scheduledAt: new Date(parsed.data.scheduledAt),
            });
            return (0, response_1.sendSuccess)(reply, { post }, 201);
        }
        catch (err) {
            const error = err;
            return (0, response_1.sendError)(reply, error.message, error.statusCode ?? 500);
        }
    });
    fastify.get('/posts', { preHandler: auth_middleware_1.authenticate }, async (request, reply) => {
        const { workspaceId } = (0, auth_middleware_1.getUser)(request);
        const parsed = scheduler_schema_1.PostsQuerySchema.safeParse(request.query);
        if (!parsed.success) {
            return (0, response_1.sendError)(reply, parsed.error.errors[0]?.message ?? 'Invalid query', 400);
        }
        try {
            const { page, limit, status, from, to } = parsed.data;
            const result = await (0, scheduler_1.getPostsByWorkspacePaged)(workspaceId, {
                page,
                limit,
                status,
                from: from ? new Date(from) : undefined,
                to: to ? new Date(to) : undefined,
            });
            return (0, response_1.sendSuccess)(reply, {
                posts: result.posts,
                pagination: {
                    page,
                    limit,
                    total: result.total,
                    pages: Math.ceil(result.total / limit),
                },
            });
        }
        catch (err) {
            const error = err;
            return (0, response_1.sendError)(reply, error.message, 500);
        }
    });
    fastify.delete('/posts/:id', { preHandler: auth_middleware_1.authenticate }, async (request, reply) => {
        const { workspaceId } = (0, auth_middleware_1.getUser)(request);
        const paramsParsed = scheduler_schema_1.PostIdParamSchema.safeParse(request.params);
        if (!paramsParsed.success) {
            return (0, response_1.sendError)(reply, 'Invalid post id', 400);
        }
        try {
            const post = await (0, scheduler_1.cancelPost)(paramsParsed.data.id, workspaceId);
            return (0, response_1.sendSuccess)(reply, { post });
        }
        catch (err) {
            const error = err;
            return (0, response_1.sendError)(reply, error.message, error.statusCode ?? 500);
        }
    });
    fastify.get('/posts/calendar', { preHandler: auth_middleware_1.authenticate }, async (request, reply) => {
        const { workspaceId } = (0, auth_middleware_1.getUser)(request);
        const parsed = scheduler_schema_1.CalendarQuerySchema.safeParse(request.query);
        if (!parsed.success) {
            return (0, response_1.sendError)(reply, 'from and to query params required (ISO datetime)', 400);
        }
        try {
            const posts = await (0, scheduler_1.getPostsByDateRange)(workspaceId, new Date(parsed.data.from), new Date(parsed.data.to));
            // Group by date string (YYYY-MM-DD)
            const grouped = posts.reduce((acc, post) => {
                const day = post.scheduledAt.toISOString().slice(0, 10);
                if (!acc[day])
                    acc[day] = [];
                acc[day].push(post);
                return acc;
            }, {});
            return (0, response_1.sendSuccess)(reply, { calendar: grouped });
        }
        catch (err) {
            const error = err;
            return (0, response_1.sendError)(reply, error.message, 500);
        }
    });
}
//# sourceMappingURL=scheduler.routes.js.map
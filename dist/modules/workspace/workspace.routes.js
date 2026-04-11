"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspaceRoutes = workspaceRoutes;
const auth_middleware_1 = require("../auth/auth.middleware");
const workspace_schema_1 = require("./workspace.schema");
const workspace_service_1 = require("./workspace.service");
const response_1 = require("../../utils/response");
async function workspaceRoutes(fastify) {
    fastify.get('/workspace', { preHandler: auth_middleware_1.authenticate }, async (request, reply) => {
        const { workspaceId } = (0, auth_middleware_1.getUser)(request);
        try {
            const workspace = await (0, workspace_service_1.getWorkspace)(workspaceId);
            return (0, response_1.sendSuccess)(reply, { workspace });
        }
        catch (err) {
            const error = err;
            return (0, response_1.sendError)(reply, error.message, error.statusCode ?? 500);
        }
    });
    fastify.patch('/workspace', { preHandler: auth_middleware_1.authenticate }, async (request, reply) => {
        const { workspaceId } = (0, auth_middleware_1.getUser)(request);
        const parsed = workspace_schema_1.UpdateWorkspaceSchema.safeParse(request.body);
        if (!parsed.success) {
            return (0, response_1.sendError)(reply, parsed.error.errors[0]?.message ?? 'Invalid input', 400);
        }
        try {
            const workspace = await (0, workspace_service_1.updateWorkspace)(workspaceId, parsed.data);
            return (0, response_1.sendSuccess)(reply, { workspace });
        }
        catch (err) {
            const error = err;
            return (0, response_1.sendError)(reply, error.message, error.statusCode ?? 500);
        }
    });
    fastify.get('/workspace/members', { preHandler: auth_middleware_1.authenticate }, async (request, reply) => {
        const { workspaceId } = (0, auth_middleware_1.getUser)(request);
        try {
            const members = await (0, workspace_service_1.getMembers)(workspaceId);
            return (0, response_1.sendSuccess)(reply, { members });
        }
        catch (err) {
            const error = err;
            return (0, response_1.sendError)(reply, error.message, error.statusCode ?? 500);
        }
    });
    fastify.post('/workspace/members/invite', { preHandler: auth_middleware_1.authenticate }, async (request, reply) => {
        const { workspaceId } = (0, auth_middleware_1.getUser)(request);
        const parsed = workspace_schema_1.InviteMemberSchema.safeParse(request.body);
        if (!parsed.success) {
            return (0, response_1.sendError)(reply, parsed.error.errors[0]?.message ?? 'Invalid input', 400);
        }
        try {
            const { sub: invitedById } = (0, auth_middleware_1.getUser)(request);
            const invite = await (0, workspace_service_1.inviteMember)(workspaceId, invitedById, parsed.data);
            return (0, response_1.sendSuccess)(reply, { invite }, 201);
        }
        catch (err) {
            const error = err;
            return (0, response_1.sendError)(reply, error.message, error.statusCode ?? 500);
        }
    });
    fastify.post('/workspace/members/accept-invite', async (request, reply) => {
        const parsed = workspace_schema_1.AcceptInviteSchema.safeParse(request.body);
        if (!parsed.success) {
            return (0, response_1.sendError)(reply, parsed.error.errors[0]?.message ?? 'Invalid input', 400);
        }
        try {
            const user = await (0, workspace_service_1.acceptInvite)(parsed.data);
            return (0, response_1.sendSuccess)(reply, { user }, 201);
        }
        catch (err) {
            const error = err;
            return (0, response_1.sendError)(reply, error.message, error.statusCode ?? 500);
        }
    });
}
//# sourceMappingURL=workspace.routes.js.map
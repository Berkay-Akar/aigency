import type { FastifyInstance } from 'fastify';
import { authenticate, getUser } from '../auth/auth.middleware';
import { UpdateWorkspaceSchema, InviteMemberSchema } from './workspace.schema';
import { getWorkspace, updateWorkspace, getMembers, inviteMember } from './workspace.service';
import { sendSuccess, sendError } from '../../utils/response';

export async function workspaceRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/workspace',
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      try {
        const workspace = await getWorkspace(workspaceId);
        return sendSuccess(reply, { workspace });
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        return sendError(reply, error.message, error.statusCode ?? 500);
      }
    },
  );

  fastify.patch(
    '/workspace',
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      const parsed = UpdateWorkspaceSchema.safeParse(request.body);

      if (!parsed.success) {
        return sendError(reply, parsed.error.errors[0]?.message ?? 'Invalid input', 400);
      }

      try {
        const workspace = await updateWorkspace(workspaceId, parsed.data);
        return sendSuccess(reply, { workspace });
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        return sendError(reply, error.message, error.statusCode ?? 500);
      }
    },
  );

  fastify.get(
    '/workspace/members',
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      try {
        const members = await getMembers(workspaceId);
        return sendSuccess(reply, { members });
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        return sendError(reply, error.message, error.statusCode ?? 500);
      }
    },
  );

  fastify.post(
    '/workspace/members/invite',
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      const parsed = InviteMemberSchema.safeParse(request.body);

      if (!parsed.success) {
        return sendError(reply, parsed.error.errors[0]?.message ?? 'Invalid input', 400);
      }

      try {
        const user = await inviteMember(workspaceId, parsed.data);
        return sendSuccess(reply, { user }, 201);
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        return sendError(reply, error.message, error.statusCode ?? 500);
      }
    },
  );
}

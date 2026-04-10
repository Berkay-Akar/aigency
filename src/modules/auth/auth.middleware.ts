import type { FastifyRequest, FastifyReply } from 'fastify';
import type { JwtPayload } from './auth.schema';
import { sendError } from '../../utils/response';

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    sendError(reply, 'Unauthorized', 401);
  }
}

export function getUser(request: FastifyRequest): JwtPayload {
  return request.user as unknown as JwtPayload;
}

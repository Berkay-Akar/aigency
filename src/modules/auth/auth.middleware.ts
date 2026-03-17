import type { FastifyRequest, FastifyReply } from 'fastify';
import type { JwtPayload } from './auth.schema';

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ success: false, error: 'Unauthorized' });
  }
}

export function getUser(request: FastifyRequest): JwtPayload {
  return request.user as unknown as JwtPayload;
}

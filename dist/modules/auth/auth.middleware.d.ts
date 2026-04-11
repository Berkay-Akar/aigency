import type { FastifyRequest, FastifyReply } from 'fastify';
import type { JwtPayload } from './auth.schema';
export declare function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
export declare function getUser(request: FastifyRequest): JwtPayload;
//# sourceMappingURL=auth.middleware.d.ts.map
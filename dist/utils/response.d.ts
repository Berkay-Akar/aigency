import type { FastifyReply } from 'fastify';
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
}
export declare function sendSuccess<T>(reply: FastifyReply, data: T, statusCode?: number): void;
export declare function sendError(reply: FastifyReply, message: string, statusCode?: number): void;
//# sourceMappingURL=response.d.ts.map
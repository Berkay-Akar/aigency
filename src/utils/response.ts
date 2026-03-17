import type { FastifyReply } from 'fastify';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode = 200): void {
  const response: ApiResponse<T> = { success: true, data };
  reply.status(statusCode).send(response);
}

export function sendError(
  reply: FastifyReply,
  message: string,
  statusCode = 500,
): void {
  const response: ApiResponse = { success: false, message };
  reply.status(statusCode).send(response);
}

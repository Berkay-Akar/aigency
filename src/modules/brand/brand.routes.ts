import type { FastifyInstance } from "fastify";
import { authenticate, getUser } from "../auth/auth.middleware";
import { CreateBrandSchema } from "./brand.schema";
import { listBrands, createBrand } from "./brand.service";
import { sendSuccess, sendError } from "../../utils/response";
import { buildWorkspaceJwtPayload } from "../auth/auth.service";

export async function brandRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    "/brands",
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { sub: userId } = getUser(request);
        const brands = await listBrands(userId);
        return sendSuccess(reply, { brands });
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        return sendError(reply, error.message, error.statusCode ?? 500);
      }
    },
  );

  fastify.post(
    "/brands",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = CreateBrandSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(
          reply,
          parsed.error.errors[0]?.message ?? "Invalid input",
          400,
        );
      }
      try {
        const { sub: userId, email } = getUser(request);
        const brand = await createBrand(userId, parsed.data);
        const payload = buildWorkspaceJwtPayload(
          userId,
          email,
          brand.workspaceId,
          brand.role,
        );
        const token = fastify.jwt.sign(payload, {
          expiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
        });
        return sendSuccess(reply, { brand, token }, 201);
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        return sendError(reply, error.message, error.statusCode ?? 500);
      }
    },
  );
}

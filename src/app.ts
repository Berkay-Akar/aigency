import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import { env } from "./config/env";
import { healthRoutes } from "./lib/health.route";
import { authRoutes } from "./modules/auth/auth.routes";
import { workspaceRoutes } from "./modules/workspace/workspace.routes";
import { aiRoutes } from "./modules/ai/ai.routes";
import { assetRoutes } from "./modules/ai/asset.routes";
import { modelPhotoRoutes } from "./modules/ai/model-photo.routes";
import { productAnglesRoutes } from "./modules/ai/product-angles.routes";
import { productReferenceRoutes } from "./modules/ai/product-reference.routes";
import { photoToVideoRoutes } from "./modules/ai/photo-to-video.routes";
import { productSwapRoutes } from "./modules/ai/product-swap.routes";
import { ghostMannequinRoutes } from "./modules/ai/ghost-mannequin.routes";
import { socialRoutes } from "./modules/social/social.routes";
import { schedulerRoutes } from "./modules/scheduler/scheduler.routes";
import { billingRoutes } from "./modules/billing/billing.routes";
import { brandRoutes, brandKitRoutes } from "./modules/brand";

export function buildApp() {
  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      transport:
        env.NODE_ENV !== "production"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
  });

  fastify.register(cors, {
    origin: env.APP_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  });

  fastify.register(sensible);
  fastify.register(multipart);

  fastify.register(jwt, {
    secret: env.JWT_SECRET,
  });

  fastify.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    keyGenerator: (request) => {
      const ua = request.headers["user-agent"] ?? "unknown";
      return `${request.ip}:${ua}`;
    },
  });

  fastify.register(healthRoutes);
  fastify.register(authRoutes);
  fastify.register(workspaceRoutes);
  fastify.register(aiRoutes);
  fastify.register(assetRoutes);
  fastify.register(modelPhotoRoutes);
  fastify.register(productAnglesRoutes);
  fastify.register(productReferenceRoutes);
  fastify.register(photoToVideoRoutes);
  fastify.register(productSwapRoutes);
  fastify.register(ghostMannequinRoutes);
  fastify.register(socialRoutes);
  fastify.register(schedulerRoutes);
  fastify.register(billingRoutes);
  fastify.register(brandRoutes);
  fastify.register(brandKitRoutes);

  return fastify;
}

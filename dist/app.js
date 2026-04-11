"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const sensible_1 = __importDefault(require("@fastify/sensible"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const env_1 = require("./config/env");
const health_route_1 = require("./lib/health.route");
const auth_routes_1 = require("./modules/auth/auth.routes");
const workspace_routes_1 = require("./modules/workspace/workspace.routes");
const ai_routes_1 = require("./modules/ai/ai.routes");
const asset_routes_1 = require("./modules/ai/asset.routes");
const social_routes_1 = require("./modules/social/social.routes");
const scheduler_routes_1 = require("./modules/scheduler/scheduler.routes");
const billing_routes_1 = require("./modules/billing/billing.routes");
function buildApp() {
    const fastify = (0, fastify_1.default)({
        logger: {
            level: env_1.env.NODE_ENV === 'production' ? 'info' : 'debug',
            transport: env_1.env.NODE_ENV !== 'production'
                ? { target: 'pino-pretty', options: { colorize: true } }
                : undefined,
        },
    });
    fastify.register(cors_1.default, {
        origin: env_1.env.APP_URL,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    });
    fastify.register(sensible_1.default);
    fastify.register(jwt_1.default, {
        secret: env_1.env.JWT_SECRET,
    });
    fastify.register(rate_limit_1.default, {
        global: true,
        max: env_1.env.RATE_LIMIT_MAX,
        timeWindow: env_1.env.RATE_LIMIT_WINDOW_MS,
        keyGenerator: (request) => {
            const ua = request.headers['user-agent'] ?? 'unknown';
            return `${request.ip}:${ua}`;
        },
    });
    fastify.register(health_route_1.healthRoutes);
    fastify.register(auth_routes_1.authRoutes);
    fastify.register(workspace_routes_1.workspaceRoutes);
    fastify.register(ai_routes_1.aiRoutes);
    fastify.register(asset_routes_1.assetRoutes);
    fastify.register(social_routes_1.socialRoutes);
    fastify.register(scheduler_routes_1.schedulerRoutes);
    fastify.register(billing_routes_1.billingRoutes);
    return fastify;
}
//# sourceMappingURL=app.js.map
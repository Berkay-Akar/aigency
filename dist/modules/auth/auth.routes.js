"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const node_crypto_1 = require("node:crypto");
const zod_1 = require("zod");
const auth_schema_1 = require("./auth.schema");
const auth_service_1 = require("./auth.service");
const response_1 = require("../../utils/response");
const env_1 = require("../../config/env");
const auth_middleware_1 = require("./auth.middleware");
const oauth_1 = require("../../services/oauth");
const RefreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1),
});
const GoogleCallbackQuerySchema = zod_1.z.object({
    code: zod_1.z.string().min(1).optional(),
    state: zod_1.z.string().min(1).optional(),
    error: zod_1.z.string().optional(),
    error_description: zod_1.z.string().optional(),
});
async function authRoutes(fastify) {
    fastify.get('/auth/google', async (_request, reply) => {
        if (!(0, env_1.isGoogleOAuthConfigured)()) {
            return (0, response_1.sendError)(reply, 'Google OAuth is not configured (set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)', 503);
        }
        const state = fastify.jwt.sign({ purpose: 'google_oauth', nonce: (0, node_crypto_1.randomUUID)() }, { expiresIn: '10m' });
        const url = (0, oauth_1.buildGoogleAuthorizationUrl)(state);
        return reply.redirect(url);
    });
    fastify.get('/auth/google/callback', async (request, reply) => {
        if (!(0, env_1.isGoogleOAuthConfigured)()) {
            return (0, response_1.sendError)(reply, 'Google OAuth is not configured (set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)', 503);
        }
        const parsed = GoogleCallbackQuerySchema.safeParse(request.query);
        if (!parsed.success) {
            return (0, response_1.sendError)(reply, 'Invalid callback query', 400);
        }
        const q = parsed.data;
        if (q.error) {
            return (0, response_1.sendError)(reply, q.error_description ?? q.error ?? 'OAuth error', 400);
        }
        if (!q.code || !q.state) {
            return (0, response_1.sendError)(reply, 'Missing code or state', 400);
        }
        let statePayload;
        try {
            statePayload = fastify.jwt.verify(q.state);
        }
        catch {
            return (0, response_1.sendError)(reply, 'Invalid or expired state', 400);
        }
        if (statePayload.purpose !== 'google_oauth') {
            return (0, response_1.sendError)(reply, 'Invalid state', 400);
        }
        try {
            const tokens = await (0, oauth_1.exchangeGoogleAuthorizationCode)(q.code);
            const profile = await (0, oauth_1.fetchGoogleUserInfo)(tokens.access_token);
            if (profile.email_verified === false) {
                return (0, response_1.sendError)(reply, 'Google email must be verified', 403);
            }
            if (!profile.email) {
                return (0, response_1.sendError)(reply, 'Google did not return an email', 400);
            }
            const { user, payload, refreshToken } = await (0, auth_service_1.authenticateWithGoogle)({
                googleId: profile.sub,
                email: profile.email,
                name: profile.name || profile.email.split('@')[0] || 'User',
            });
            const token = fastify.jwt.sign(payload, {
                expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
            });
            return (0, response_1.sendSuccess)(reply, { token, refreshToken, user }, 200);
        }
        catch (err) {
            const error = err;
            return (0, response_1.sendError)(reply, error.message, error.statusCode ?? 500);
        }
    });
    fastify.post('/auth/register', {
        config: {
            rateLimit: { max: 10, timeWindow: 60_000 },
        },
    }, async (request, reply) => {
        const parsed = auth_schema_1.RegisterSchema.safeParse(request.body);
        if (!parsed.success) {
            return (0, response_1.sendError)(reply, parsed.error.errors[0]?.message ?? 'Invalid input', 400);
        }
        try {
            const { user, payload, refreshToken } = await (0, auth_service_1.register)(parsed.data);
            const token = fastify.jwt.sign(payload, {
                expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
            });
            return (0, response_1.sendSuccess)(reply, { token, refreshToken, user }, 201);
        }
        catch (err) {
            const error = err;
            return (0, response_1.sendError)(reply, error.message, error.statusCode ?? 500);
        }
    });
    fastify.post('/auth/login', {
        config: {
            rateLimit: { max: 15, timeWindow: 60_000 },
        },
    }, async (request, reply) => {
        const parsed = auth_schema_1.LoginSchema.safeParse(request.body);
        if (!parsed.success) {
            return (0, response_1.sendError)(reply, parsed.error.errors[0]?.message ?? 'Invalid input', 400);
        }
        try {
            const { user, payload, refreshToken } = await (0, auth_service_1.login)(parsed.data);
            const token = fastify.jwt.sign(payload, {
                expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
            });
            return (0, response_1.sendSuccess)(reply, { token, refreshToken, user });
        }
        catch (err) {
            const error = err;
            return (0, response_1.sendError)(reply, error.message, error.statusCode ?? 500);
        }
    });
    fastify.post('/auth/refresh', {
        config: {
            rateLimit: { max: 20, timeWindow: 60_000 },
        },
    }, async (request, reply) => {
        const parsed = RefreshSchema.safeParse(request.body);
        if (!parsed.success) {
            return (0, response_1.sendError)(reply, 'refreshToken is required', 400);
        }
        try {
            const { user, payload, refreshToken } = await (0, auth_service_1.rotateRefreshToken)(parsed.data.refreshToken);
            const token = fastify.jwt.sign(payload, {
                expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
            });
            return (0, response_1.sendSuccess)(reply, { token, refreshToken, user });
        }
        catch (err) {
            const error = err;
            return (0, response_1.sendError)(reply, error.message, error.statusCode ?? 500);
        }
    });
    fastify.post('/auth/google/unlink', { preHandler: auth_middleware_1.authenticate }, async (request, reply) => {
        try {
            const { sub } = (0, auth_middleware_1.getUser)(request);
            const user = await (0, auth_service_1.unlinkGoogleFromUser)(sub);
            return (0, response_1.sendSuccess)(reply, { user });
        }
        catch (err) {
            const error = err;
            return (0, response_1.sendError)(reply, error.message, error.statusCode ?? 500);
        }
    });
}
//# sourceMappingURL=auth.routes.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socialRoutes = socialRoutes;
const env_1 = require("../../config/env");
const auth_middleware_1 = require("../auth/auth.middleware");
const social_schema_1 = require("./social.schema");
const prisma_1 = require("../../lib/prisma");
const social_1 = require("../../services/social");
const response_1 = require("../../utils/response");
function verifySocialOAuthState(fastify, state, platform) {
    try {
        const payload = fastify.jwt.verify(state);
        if (payload.purpose !== 'social_oauth' ||
            payload.platform !== platform ||
            typeof payload.workspaceId !== 'string' ||
            typeof payload.sub !== 'string') {
            return null;
        }
        return payload;
    }
    catch {
        return null;
    }
}
async function socialRoutes(fastify) {
    // Redirect user to platform OAuth page
    fastify.get('/social/connect/:platform', { preHandler: auth_middleware_1.authenticate }, async (request, reply) => {
        const paramsParsed = social_schema_1.PlatformParamSchema.safeParse(request.params);
        if (!paramsParsed.success) {
            return (0, response_1.sendError)(reply, 'Unsupported platform', 400);
        }
        const { platform } = paramsParsed.data;
        const { workspaceId, sub } = (0, auth_middleware_1.getUser)(request);
        const state = fastify.jwt.sign({
            purpose: 'social_oauth',
            platform,
            workspaceId,
            sub,
        }, { expiresIn: '10m' });
        if (platform === 'instagram') {
            const url = new URL('https://api.instagram.com/oauth/authorize');
            url.searchParams.set('client_id', env_1.env.INSTAGRAM_CLIENT_ID);
            url.searchParams.set('redirect_uri', env_1.env.INSTAGRAM_REDIRECT_URI);
            url.searchParams.set('scope', 'instagram_basic,instagram_content_publish');
            url.searchParams.set('response_type', 'code');
            url.searchParams.set('state', state);
            return reply.redirect(url.toString());
        }
        const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
        url.searchParams.set('client_key', env_1.env.TIKTOK_CLIENT_KEY);
        url.searchParams.set('redirect_uri', env_1.env.TIKTOK_REDIRECT_URI);
        url.searchParams.set('scope', 'user.info.basic,video.publish');
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('state', state);
        return reply.redirect(url.toString());
    });
    fastify.get('/social/callback/instagram', async (request, reply) => {
        const raw = request.query;
        if (raw.error) {
            return (0, response_1.sendError)(reply, raw.error_description ?? raw.error, 400);
        }
        const parsed = social_schema_1.InstagramCallbackSchema.safeParse(request.query);
        if (!parsed.success) {
            return (0, response_1.sendError)(reply, 'Invalid OAuth callback (code and state required)', 400);
        }
        const q = parsed.data;
        const statePayload = verifySocialOAuthState(fastify, q.state, 'instagram');
        if (!statePayload) {
            return (0, response_1.sendError)(reply, 'Invalid or expired state', 400);
        }
        const workspaceId = statePayload.workspaceId;
        try {
            // Exchange code for token
            const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: env_1.env.INSTAGRAM_CLIENT_ID,
                    client_secret: env_1.env.INSTAGRAM_CLIENT_SECRET,
                    grant_type: 'authorization_code',
                    redirect_uri: env_1.env.INSTAGRAM_REDIRECT_URI,
                    code: q.code,
                }).toString(),
            });
            if (!tokenRes.ok) {
                return (0, response_1.sendError)(reply, 'Token exchange failed', 502);
            }
            const tokenData = await tokenRes.json();
            // Get account info
            const profileRes = await fetch(`https://graph.instagram.com/${tokenData.user_id}?fields=id,username&access_token=${tokenData.access_token}`);
            const profile = await profileRes.json();
            const encryptedToken = (0, social_1.encryptToken)(tokenData.access_token);
            const connection = await prisma_1.prisma.socialConnection.upsert({
                where: {
                    workspaceId_platform_accountId: {
                        workspaceId,
                        platform: 'INSTAGRAM',
                        accountId: profile.id,
                    },
                },
                update: { accessToken: encryptedToken, accountName: profile.username },
                create: {
                    workspaceId,
                    platform: 'INSTAGRAM',
                    accountId: profile.id,
                    accountName: profile.username,
                    accessToken: encryptedToken,
                },
            });
            return (0, response_1.sendSuccess)(reply, {
                platform: 'instagram',
                accountName: connection.accountName,
            });
        }
        catch (err) {
            const error = err;
            fastify.log.error({ err }, 'Instagram OAuth callback failed');
            return (0, response_1.sendError)(reply, error.message, 500);
        }
    });
    fastify.get('/social/callback/tiktok', async (request, reply) => {
        const raw = request.query;
        if (raw.error) {
            return (0, response_1.sendError)(reply, raw.error_description ?? raw.error, 400);
        }
        const parsed = social_schema_1.TikTokCallbackSchema.safeParse(request.query);
        if (!parsed.success) {
            return (0, response_1.sendError)(reply, 'Invalid OAuth callback (code and state required)', 400);
        }
        const q = parsed.data;
        const statePayload = verifySocialOAuthState(fastify, q.state, 'tiktok');
        if (!statePayload) {
            return (0, response_1.sendError)(reply, 'Invalid or expired state', 400);
        }
        const workspaceId = statePayload.workspaceId;
        try {
            const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_key: env_1.env.TIKTOK_CLIENT_KEY,
                    client_secret: env_1.env.TIKTOK_CLIENT_SECRET,
                    grant_type: 'authorization_code',
                    redirect_uri: env_1.env.TIKTOK_REDIRECT_URI,
                    code: q.code,
                }).toString(),
            });
            if (!tokenRes.ok) {
                return (0, response_1.sendError)(reply, 'TikTok token exchange failed', 502);
            }
            const tokenData = await tokenRes.json();
            const profileRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name', { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
            const profileData = await profileRes.json();
            const profile = profileData.data.user;
            const encryptedAccess = (0, social_1.encryptToken)(tokenData.access_token);
            const encryptedRefresh = (0, social_1.encryptToken)(tokenData.refresh_token);
            const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
            const connection = await prisma_1.prisma.socialConnection.upsert({
                where: {
                    workspaceId_platform_accountId: {
                        workspaceId,
                        platform: 'TIKTOK',
                        accountId: profile.open_id,
                    },
                },
                update: {
                    accessToken: encryptedAccess,
                    refreshToken: encryptedRefresh,
                    accountName: profile.display_name,
                    expiresAt,
                },
                create: {
                    workspaceId,
                    platform: 'TIKTOK',
                    accountId: profile.open_id,
                    accountName: profile.display_name,
                    accessToken: encryptedAccess,
                    refreshToken: encryptedRefresh,
                    expiresAt,
                },
            });
            return (0, response_1.sendSuccess)(reply, {
                platform: 'tiktok',
                accountName: connection.accountName,
            });
        }
        catch (err) {
            const error = err;
            fastify.log.error({ err }, 'TikTok OAuth callback failed');
            return (0, response_1.sendError)(reply, error.message, 500);
        }
    });
    // List connected social accounts for the workspace
    fastify.get('/social/connections', { preHandler: auth_middleware_1.authenticate }, async (request, reply) => {
        const { workspaceId } = (0, auth_middleware_1.getUser)(request);
        const connections = await prisma_1.prisma.socialConnection.findMany({
            where: { workspaceId },
            select: { id: true, platform: true, accountId: true, accountName: true, expiresAt: true, createdAt: true },
        });
        return (0, response_1.sendSuccess)(reply, { connections });
    });
}
//# sourceMappingURL=social.routes.js.map
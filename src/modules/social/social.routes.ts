import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env';
import { authenticate, getUser } from '../auth/auth.middleware';
import { PlatformParamSchema, InstagramCallbackSchema, TikTokCallbackSchema } from './social.schema';
import { prisma } from '../../lib/prisma';
import { encryptToken } from '../../services/social';
import { sendSuccess, sendError } from '../../utils/response';

export async function socialRoutes(fastify: FastifyInstance): Promise<void> {
  // Redirect user to platform OAuth page
  fastify.get(
    '/social/connect/:platform',
    { preHandler: authenticate },
    async (request, reply) => {
      const paramsParsed = PlatformParamSchema.safeParse(request.params);

      if (!paramsParsed.success) {
        return sendError(reply, 'Unsupported platform', 400);
      }

      const { platform } = paramsParsed.data;

      if (platform === 'instagram') {
        const url = new URL('https://api.instagram.com/oauth/authorize');
        url.searchParams.set('client_id', env.INSTAGRAM_CLIENT_ID);
        url.searchParams.set('redirect_uri', env.INSTAGRAM_REDIRECT_URI);
        url.searchParams.set('scope', 'instagram_basic,instagram_content_publish');
        url.searchParams.set('response_type', 'code');
        return reply.redirect(url.toString());
      }

      // TikTok
      const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
      url.searchParams.set('client_key', env.TIKTOK_CLIENT_KEY);
      url.searchParams.set('redirect_uri', env.TIKTOK_REDIRECT_URI);
      url.searchParams.set('scope', 'user.info.basic,video.publish');
      url.searchParams.set('response_type', 'code');
      return reply.redirect(url.toString());
    },
  );

  // Handle Instagram OAuth callback
  fastify.get(
    '/social/callback/instagram',
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      const parsed = InstagramCallbackSchema.safeParse(request.query);

      if (!parsed.success) {
        return sendError(reply, 'Missing OAuth code', 400);
      }

      try {
        // Exchange code for token
        const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: env.INSTAGRAM_CLIENT_ID,
            client_secret: env.INSTAGRAM_CLIENT_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: env.INSTAGRAM_REDIRECT_URI,
            code: parsed.data.code,
          }).toString(),
        });

        if (!tokenRes.ok) {
          return sendError(reply, 'Token exchange failed', 502);
        }

        const tokenData = await tokenRes.json() as {
          access_token: string;
          user_id: string;
        };

        // Get account info
        const profileRes = await fetch(
          `https://graph.instagram.com/${tokenData.user_id}?fields=id,username&access_token=${tokenData.access_token}`,
        );
        const profile = await profileRes.json() as { id: string; username: string };

        const encryptedToken = encryptToken(tokenData.access_token);

        const connection = await prisma.socialConnection.upsert({
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

        return sendSuccess(reply, {
          platform: 'instagram',
          accountName: connection.accountName,
        });
      } catch (err) {
        const error = err as Error;
        fastify.log.error({ err }, 'Instagram OAuth callback failed');
        return sendError(reply, error.message, 500);
      }
    },
  );

  // Handle TikTok OAuth callback
  fastify.get(
    '/social/callback/tiktok',
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      const parsed = TikTokCallbackSchema.safeParse(request.query);

      if (!parsed.success) {
        return sendError(reply, 'Missing OAuth code', 400);
      }

      try {
        const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_key: env.TIKTOK_CLIENT_KEY,
            client_secret: env.TIKTOK_CLIENT_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: env.TIKTOK_REDIRECT_URI,
            code: parsed.data.code,
          }).toString(),
        });

        if (!tokenRes.ok) {
          return sendError(reply, 'TikTok token exchange failed', 502);
        }

        const tokenData = await tokenRes.json() as {
          access_token: string;
          refresh_token: string;
          open_id: string;
          expires_in: number;
        };

        const profileRes = await fetch(
          'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name',
          { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
        );
        const profileData = await profileRes.json() as {
          data: { user: { open_id: string; display_name: string } };
        };
        const profile = profileData.data.user;

        const encryptedAccess = encryptToken(tokenData.access_token);
        const encryptedRefresh = encryptToken(tokenData.refresh_token);
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

        const connection = await prisma.socialConnection.upsert({
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

        return sendSuccess(reply, {
          platform: 'tiktok',
          accountName: connection.accountName,
        });
      } catch (err) {
        const error = err as Error;
        fastify.log.error({ err }, 'TikTok OAuth callback failed');
        return sendError(reply, error.message, 500);
      }
    },
  );

  // List connected social accounts for the workspace
  fastify.get(
    '/social/connections',
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      const connections = await prisma.socialConnection.findMany({
        where: { workspaceId },
        select: { id: true, platform: true, accountId: true, accountName: true, expiresAt: true, createdAt: true },
      });
      return sendSuccess(reply, { connections });
    },
  );
}

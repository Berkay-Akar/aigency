import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { encryptToken } from './crypto';
import * as InstagramService from './instagram.service';
import * as TikTokService from './tiktok.service';

const REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export async function refreshConnectionIfNeeded(connectionId: string): Promise<void> {
  const connection = await prisma.socialConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection) return;
  if (connection.status === 'INVALID') return;
  if (!connection.expiresAt) return;

  const shouldRefresh = connection.expiresAt.getTime() - Date.now() <= REFRESH_THRESHOLD_MS;
  if (!shouldRefresh) return;

  try {
    if (connection.platform === 'INSTAGRAM') {
      const accessToken = await InstagramService.refreshToken(connection.accessToken);
      await prisma.socialConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: encryptToken(accessToken),
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
          invalidAt: null,
          lastCheckedAt: new Date(),
        },
      });
      return;
    }

    if (!connection.refreshToken) {
      throw new Error('Missing TikTok refresh token');
    }

    const refreshed = await TikTokService.refreshToken(
      connection.refreshToken,
      env.TIKTOK_CLIENT_KEY,
      env.TIKTOK_CLIENT_SECRET,
    );
    await prisma.socialConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: encryptToken(refreshed.accessToken),
        refreshToken: encryptToken(refreshed.refreshToken),
        expiresAt: refreshed.expiresAt,
        status: 'ACTIVE',
        invalidAt: null,
        lastCheckedAt: new Date(),
      },
    });
  } catch (err) {
    const error = err as Error;
    await prisma.socialConnection.update({
      where: { id: connection.id },
      data: {
        status: 'INVALID',
        invalidAt: new Date(),
        lastCheckedAt: new Date(),
      },
    });
    throw error;
  }
}

export async function refreshExpiringSocialConnections(limit = 50): Promise<number> {
  const threshold = new Date(Date.now() + REFRESH_THRESHOLD_MS);
  const connections = await prisma.socialConnection.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lte: threshold },
    },
    take: limit,
    orderBy: { expiresAt: 'asc' },
  });

  for (const connection of connections) {
    await refreshConnectionIfNeeded(connection.id).catch(() => undefined);
  }
  return connections.length;
}

import { env } from '../../config/env';
import { decryptToken } from './crypto';

const GRAPH_BASE = 'https://graph.instagram.com/v19.0';

export interface PublishPostInput {
  accessToken: string;
  imageUrl: string;
  caption: string;
}

export interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

export interface TokenValidation {
  valid: boolean;
  expiresAt?: Date;
}

export async function publishPost(input: PublishPostInput): Promise<PublishResult> {
  const token = decryptToken(input.accessToken);

  try {
    // Step 1: Create media container
    const containerRes = await fetch(`${GRAPH_BASE}/me/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: input.imageUrl,
        caption: input.caption,
        access_token: token,
      }),
    });

    if (!containerRes.ok) {
      const err = await containerRes.text();
      return { success: false, error: `Container creation failed: ${err}` };
    }

    const container = await containerRes.json() as { id: string };

    // Step 2: Publish container
    const publishRes = await fetch(`${GRAPH_BASE}/me/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: token,
      }),
    });

    if (!publishRes.ok) {
      const err = await publishRes.text();
      return { success: false, error: `Publish failed: ${err}` };
    }

    const published = await publishRes.json() as { id: string };
    return { success: true, postId: published.id };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}

export async function validateToken(encryptedToken: string): Promise<TokenValidation> {
  const token = decryptToken(encryptedToken);

  try {
    const res = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${env.INSTAGRAM_CLIENT_ID}|${env.INSTAGRAM_CLIENT_SECRET}`,
    );

    if (!res.ok) return { valid: false };

    const data = await res.json() as { data: { is_valid: boolean; expires_at?: number } };

    return {
      valid: data.data.is_valid,
      expiresAt: data.data.expires_at
        ? new Date(data.data.expires_at * 1000)
        : undefined,
    };
  } catch {
    return { valid: false };
  }
}

export async function refreshToken(encryptedToken: string): Promise<string> {
  const token = decryptToken(encryptedToken);

  const res = await fetch(
    `${GRAPH_BASE}/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`,
  );

  if (!res.ok) {
    throw new Error('Instagram token refresh failed');
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

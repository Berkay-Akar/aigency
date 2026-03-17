import { decryptToken } from './crypto';

const TIKTOK_BASE = 'https://open.tiktokapis.com/v2';

export interface TikTokPublishInput {
  accessToken: string;
  videoUrl: string;
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

export async function publishPost(input: TikTokPublishInput): Promise<PublishResult> {
  const token = decryptToken(input.accessToken);

  try {
    // Initialize upload
    const initRes = await fetch(`${TIKTOK_BASE}/post/publish/video/init/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: input.caption.slice(0, 150),
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: input.videoUrl,
        },
      }),
    });

    if (!initRes.ok) {
      const err = await initRes.text();
      return { success: false, error: `TikTok init failed: ${err}` };
    }

    const init = await initRes.json() as { data: { publish_id: string } };
    return { success: true, postId: init.data.publish_id };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}

export async function validateToken(encryptedToken: string): Promise<TokenValidation> {
  const token = decryptToken(encryptedToken);

  try {
    const res = await fetch(`${TIKTOK_BASE}/user/info/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return { valid: false };

    return { valid: true };
  } catch {
    return { valid: false };
  }
}

export async function refreshToken(
  encryptedRefreshToken: string,
  clientKey: string,
  clientSecret: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const refreshToken = decryptToken(encryptedRefreshToken);

  const params = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new Error('TikTok token refresh failed');
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

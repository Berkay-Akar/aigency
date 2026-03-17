import { z } from 'zod';

export const PlatformParamSchema = z.object({
  platform: z.enum(['instagram', 'tiktok']),
});

export const InstagramCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
});

export const TikTokCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
  scopes: z.string().optional(),
});

export type PlatformParam = z.infer<typeof PlatformParamSchema>;

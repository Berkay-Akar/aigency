import { z } from 'zod';

export const PlatformParamSchema = z.object({
  platform: z.enum(['instagram', 'tiktok']),
});

export const InstagramCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const TikTokCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  scopes: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export type PlatformParam = z.infer<typeof PlatformParamSchema>;

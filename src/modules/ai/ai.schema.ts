import { z } from 'zod';

export const GenerateSchema = z.object({
  type: z.enum(['image', 'video']),
  prompt: z.string().min(3).max(1000),
  platform: z.enum(['instagram', 'tiktok', 'general']).default('general'),
  style: z.string().max(200).optional(),
  targetAudience: z.string().max(200).optional(),
  tone: z.enum(['professional', 'casual', 'humorous', 'inspirational']).optional(),
  options: z
    .object({
      width: z.number().int().min(256).max(2048).optional(),
      height: z.number().int().min(256).max(2048).optional(),
      numImages: z.number().int().min(1).max(4).optional(),
      negativePrompt: z.string().max(500).optional(),
      durationSeconds: z.number().int().min(3).max(30).optional(),
      aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional(),
    })
    .optional(),
});

export type GenerateInput = z.infer<typeof GenerateSchema>;

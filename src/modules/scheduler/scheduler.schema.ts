import { z } from 'zod';

export const SchedulePostSchema = z.object({
  assetId: z.string().min(1),
  platform: z.enum(['INSTAGRAM', 'TIKTOK']),
  caption: z.string().min(1).max(2200),
  hashtags: z.array(z.string().min(1).max(50)).max(30).default([]),
  scheduledAt: z.string().datetime(),
});

export const CalendarQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

export const PostIdParamSchema = z.object({
  id: z.string().min(1),
});

export const PostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type SchedulePostInput = z.infer<typeof SchedulePostSchema>;
export type CalendarQuery = z.infer<typeof CalendarQuerySchema>;
export type PostsQuery = z.infer<typeof PostsQuerySchema>;

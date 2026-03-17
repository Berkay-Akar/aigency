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

export type SchedulePostInput = z.infer<typeof SchedulePostSchema>;
export type CalendarQuery = z.infer<typeof CalendarQuerySchema>;

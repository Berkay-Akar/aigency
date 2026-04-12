import { z } from "zod";
import { VIDEO_PLATFORM_OPTIONS } from "../../config/product-generation";

export const PhotoToVideoSchema = z.object({
  imageUrl: z.string().url("imageUrl must be a valid URL"),
  platform: z.enum(VIDEO_PLATFORM_OPTIONS).default("general"),
  duration: z.union([z.literal(5), z.literal(10)]).default(5),
  modelTier: z.enum(["fast", "standard", "premium"]).default("standard"),
  customPrompt: z
    .string()
    .max(500, "Custom prompt must be 500 characters or fewer")
    .optional(),
});

export type PhotoToVideoInput = z.infer<typeof PhotoToVideoSchema>;

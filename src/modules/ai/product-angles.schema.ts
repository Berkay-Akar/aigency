import { z } from "zod";
import { RESOLUTION_OPTIONS } from "../../config/model-photo";

export const ProductAnglesSchema = z.object({
  productImageUrl: z.string().url("productImageUrl must be a valid URL"),
  count: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  resolution: z.enum(RESOLUTION_OPTIONS).default("1K"),
  outputFormat: z.enum(["png", "jpeg", "webp"]).default("webp"),
  modelTier: z.enum(["fast", "standard", "premium"]).default("standard"),
  customPrompt: z
    .string()
    .max(500, "Custom prompt must be 500 characters or fewer")
    .optional(),
  useBrandKit: z.boolean().default(false),
});

export type ProductAnglesInput = z.infer<typeof ProductAnglesSchema>;

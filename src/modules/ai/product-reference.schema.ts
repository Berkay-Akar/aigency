import { z } from "zod";
import { RESOLUTION_OPTIONS } from "../../config/model-photo";
import { STYLE_MODE_OPTIONS } from "../../config/product-generation";

export const ProductReferenceSchema = z.object({
  productImageUrl: z.string().url("productImageUrl must be a valid URL"),
  referenceImageUrl: z.string().url("referenceImageUrl must be a valid URL"),
  styleMode: z.enum(STYLE_MODE_OPTIONS).default("minimal"),
  resolution: z.enum(RESOLUTION_OPTIONS).default("1K"),
  outputFormat: z.enum(["png", "jpeg", "webp"]).default("webp"),
  modelTier: z.enum(["fast", "standard", "premium"]).default("standard"),
  customPrompt: z
    .string()
    .max(500, "Custom prompt must be 500 characters or fewer")
    .optional(),
  useBrandKit: z.boolean().default(false),
});

export type ProductReferenceInput = z.infer<typeof ProductReferenceSchema>;

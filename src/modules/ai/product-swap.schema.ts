import { z } from "zod";
import { RESOLUTION_OPTIONS } from "../../config/model-photo";

export const ProductSwapSchema = z.object({
  /** The product you want to place into the scene */
  productImageUrl: z.string().url("productImageUrl must be a valid URL"),
  /** The existing scene/photo where the product will be swapped in */
  sceneImageUrl: z.string().url("sceneImageUrl must be a valid URL"),
  resolution: z.enum(RESOLUTION_OPTIONS).default("1K"),
  modelTier: z.enum(["fast", "standard", "premium"]).default("standard"),
  outputFormat: z.enum(["png", "jpeg", "webp"]).default("webp"),
  customPrompt: z
    .string()
    .max(500, "Custom prompt must be 500 characters or fewer")
    .optional(),
});

export type ProductSwapInput = z.infer<typeof ProductSwapSchema>;

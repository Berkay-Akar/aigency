import { z } from "zod";

export const GhostMannequinSchema = z.object({
  /** URL of the garment photo with a human model (or just the garment) */
  productImageUrl: z.string().url("productImageUrl must be a valid URL"),
  /** standard = 1 fal call; premium = background-remove first, then ghost-mannequin */
  quality: z.enum(["standard", "premium"]).default("standard"),
  /** Background color string interpolated into the prompt */
  backgroundColor: z
    .string()
    .max(50, "backgroundColor must be 50 characters or fewer")
    .default("white"),
  /** PNG default: preserves transparency/clean edges better */
  outputFormat: z.enum(["png", "jpeg", "webp"]).default("png"),
  customPrompt: z
    .string()
    .max(500, "Custom prompt must be 500 characters or fewer")
    .optional(),
});

export type GhostMannequinInput = z.infer<typeof GhostMannequinSchema>;

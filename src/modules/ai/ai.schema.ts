import { z } from 'zod';

export const GenerationModeSchema = z.enum([
  'text-to-image',
  'image-to-image',
  'image-to-video',
]);

export const ModelTierSchema = z.enum(['fast', 'standard', 'premium']);

export const AspectRatioPresetSchema = z.enum([
  'portrait',
  'landscape',
  'square',
  'custom',
]);

export const OutputFormatSchema = z.enum(['png', 'jpeg', 'webp']);

export const GenerateSchema = z
  .object({
    mode: GenerationModeSchema,
    modelTier: ModelTierSchema.default('standard'),
    prompt: z.string().min(3).max(4000),
    enhancePrompt: z.boolean().default(false),
    aspectRatio: AspectRatioPresetSchema.default('square'),
    customWidth: z.number().int().min(256).max(2048).optional(),
    customHeight: z.number().int().min(256).max(2048).optional(),
    outputFormat: OutputFormatSchema.default('png'),
    imageUrls: z.array(z.string().url()).max(8).default([]),
    duration: z.union([z.literal(5), z.literal(10)]).default(5),
    platform: z.enum(['instagram', 'tiktok', 'general']).optional(),
    tone: z
      .enum(['professional', 'casual', 'humorous', 'inspirational'])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.aspectRatio === 'custom') {
      if (data.customWidth == null || data.customHeight == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'customWidth and customHeight are required when aspectRatio is custom',
          path: ['customWidth'],
        });
      }
    }
    if (data.mode === 'image-to-image' && data.imageUrls.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'imageUrls must include at least one URL for image-to-image',
        path: ['imageUrls'],
      });
    }
    if (data.mode === 'image-to-video' && data.imageUrls.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'imageUrls must include at least one URL for image-to-video',
        path: ['imageUrls'],
      });
    }
    if (data.mode === 'text-to-image' && data.imageUrls.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'imageUrls must be empty for text-to-image',
        path: ['imageUrls'],
      });
    }
  });

export type GenerateInput = z.infer<typeof GenerateSchema>;

export const EnhancePromptSchema = z.object({
  prompt: z.string().min(3).max(4000),
  mode: GenerationModeSchema,
});

export type EnhancePromptInput = z.infer<typeof EnhancePromptSchema>;

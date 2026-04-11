"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancePromptSchema = exports.GenerateSchema = exports.OutputFormatSchema = exports.AspectRatioPresetSchema = exports.ModelTierSchema = exports.GenerationModeSchema = void 0;
const zod_1 = require("zod");
exports.GenerationModeSchema = zod_1.z.enum([
    'text-to-image',
    'image-to-image',
    'image-to-video',
]);
exports.ModelTierSchema = zod_1.z.enum(['fast', 'standard', 'premium']);
exports.AspectRatioPresetSchema = zod_1.z.enum([
    'portrait',
    'landscape',
    'square',
    'custom',
]);
exports.OutputFormatSchema = zod_1.z.enum(['png', 'jpeg', 'webp']);
exports.GenerateSchema = zod_1.z
    .object({
    mode: exports.GenerationModeSchema,
    modelTier: exports.ModelTierSchema.default('standard'),
    prompt: zod_1.z.string().min(3).max(4000),
    enhancePrompt: zod_1.z.boolean().default(false),
    aspectRatio: exports.AspectRatioPresetSchema.default('square'),
    customWidth: zod_1.z.number().int().min(256).max(2048).optional(),
    customHeight: zod_1.z.number().int().min(256).max(2048).optional(),
    outputFormat: exports.OutputFormatSchema.default('png'),
    imageUrls: zod_1.z.array(zod_1.z.string().url()).max(8).default([]),
    duration: zod_1.z.union([zod_1.z.literal(5), zod_1.z.literal(10)]).default(5),
    platform: zod_1.z.enum(['instagram', 'tiktok', 'general']).optional(),
    tone: zod_1.z
        .enum(['professional', 'casual', 'humorous', 'inspirational'])
        .optional(),
})
    .superRefine((data, ctx) => {
    if (data.aspectRatio === 'custom') {
        if (data.customWidth == null || data.customHeight == null) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: 'customWidth and customHeight are required when aspectRatio is custom',
                path: ['customWidth'],
            });
        }
    }
    if (data.mode === 'image-to-image' && data.imageUrls.length < 1) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'imageUrls must include at least one URL for image-to-image',
            path: ['imageUrls'],
        });
    }
    if (data.mode === 'image-to-video' && data.imageUrls.length < 1) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'imageUrls must include at least one URL for image-to-video',
            path: ['imageUrls'],
        });
    }
    if (data.mode === 'text-to-image' && data.imageUrls.length > 0) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'imageUrls must be empty for text-to-image',
            path: ['imageUrls'],
        });
    }
});
exports.EnhancePromptSchema = zod_1.z.object({
    prompt: zod_1.z.string().min(3).max(4000),
    mode: exports.GenerationModeSchema,
});
//# sourceMappingURL=ai.schema.js.map
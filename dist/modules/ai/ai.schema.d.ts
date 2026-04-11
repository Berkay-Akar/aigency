import { z } from 'zod';
export declare const GenerationModeSchema: z.ZodEnum<["text-to-image", "image-to-image", "image-to-video"]>;
export declare const ModelTierSchema: z.ZodEnum<["fast", "standard", "premium"]>;
export declare const AspectRatioPresetSchema: z.ZodEnum<["portrait", "landscape", "square", "custom"]>;
export declare const OutputFormatSchema: z.ZodEnum<["png", "jpeg", "webp"]>;
export declare const GenerateSchema: z.ZodEffects<z.ZodObject<{
    mode: z.ZodEnum<["text-to-image", "image-to-image", "image-to-video"]>;
    modelTier: z.ZodDefault<z.ZodEnum<["fast", "standard", "premium"]>>;
    prompt: z.ZodString;
    enhancePrompt: z.ZodDefault<z.ZodBoolean>;
    aspectRatio: z.ZodDefault<z.ZodEnum<["portrait", "landscape", "square", "custom"]>>;
    customWidth: z.ZodOptional<z.ZodNumber>;
    customHeight: z.ZodOptional<z.ZodNumber>;
    outputFormat: z.ZodDefault<z.ZodEnum<["png", "jpeg", "webp"]>>;
    imageUrls: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    duration: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<5>, z.ZodLiteral<10>]>>;
    platform: z.ZodOptional<z.ZodEnum<["instagram", "tiktok", "general"]>>;
    tone: z.ZodOptional<z.ZodEnum<["professional", "casual", "humorous", "inspirational"]>>;
}, "strip", z.ZodTypeAny, {
    mode: "text-to-image" | "image-to-image" | "image-to-video";
    modelTier: "fast" | "standard" | "premium";
    prompt: string;
    enhancePrompt: boolean;
    aspectRatio: "portrait" | "landscape" | "square" | "custom";
    outputFormat: "png" | "jpeg" | "webp";
    imageUrls: string[];
    duration: 5 | 10;
    platform?: "instagram" | "tiktok" | "general" | undefined;
    customWidth?: number | undefined;
    customHeight?: number | undefined;
    tone?: "professional" | "casual" | "humorous" | "inspirational" | undefined;
}, {
    mode: "text-to-image" | "image-to-image" | "image-to-video";
    prompt: string;
    platform?: "instagram" | "tiktok" | "general" | undefined;
    modelTier?: "fast" | "standard" | "premium" | undefined;
    enhancePrompt?: boolean | undefined;
    aspectRatio?: "portrait" | "landscape" | "square" | "custom" | undefined;
    customWidth?: number | undefined;
    customHeight?: number | undefined;
    outputFormat?: "png" | "jpeg" | "webp" | undefined;
    imageUrls?: string[] | undefined;
    duration?: 5 | 10 | undefined;
    tone?: "professional" | "casual" | "humorous" | "inspirational" | undefined;
}>, {
    mode: "text-to-image" | "image-to-image" | "image-to-video";
    modelTier: "fast" | "standard" | "premium";
    prompt: string;
    enhancePrompt: boolean;
    aspectRatio: "portrait" | "landscape" | "square" | "custom";
    outputFormat: "png" | "jpeg" | "webp";
    imageUrls: string[];
    duration: 5 | 10;
    platform?: "instagram" | "tiktok" | "general" | undefined;
    customWidth?: number | undefined;
    customHeight?: number | undefined;
    tone?: "professional" | "casual" | "humorous" | "inspirational" | undefined;
}, {
    mode: "text-to-image" | "image-to-image" | "image-to-video";
    prompt: string;
    platform?: "instagram" | "tiktok" | "general" | undefined;
    modelTier?: "fast" | "standard" | "premium" | undefined;
    enhancePrompt?: boolean | undefined;
    aspectRatio?: "portrait" | "landscape" | "square" | "custom" | undefined;
    customWidth?: number | undefined;
    customHeight?: number | undefined;
    outputFormat?: "png" | "jpeg" | "webp" | undefined;
    imageUrls?: string[] | undefined;
    duration?: 5 | 10 | undefined;
    tone?: "professional" | "casual" | "humorous" | "inspirational" | undefined;
}>;
export type GenerateInput = z.infer<typeof GenerateSchema>;
export declare const EnhancePromptSchema: z.ZodObject<{
    prompt: z.ZodString;
    mode: z.ZodEnum<["text-to-image", "image-to-image", "image-to-video"]>;
}, "strip", z.ZodTypeAny, {
    mode: "text-to-image" | "image-to-image" | "image-to-video";
    prompt: string;
}, {
    mode: "text-to-image" | "image-to-image" | "image-to-video";
    prompt: string;
}>;
export type EnhancePromptInput = z.infer<typeof EnhancePromptSchema>;
//# sourceMappingURL=ai.schema.d.ts.map
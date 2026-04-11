/**
 * fal.ai model IDs by generation mode and price tier (Hızlı / Standart / Premium).
 */
export type GenerationMode = 'text-to-image' | 'image-to-image' | 'image-to-video';
export type ModelTier = 'fast' | 'standard' | 'premium';
export declare function resolveModelId(mode: GenerationMode, tier: ModelTier): string;
export declare function supportsKlingAspectRatio(modelId: string): boolean;
//# sourceMappingURL=models.d.ts.map
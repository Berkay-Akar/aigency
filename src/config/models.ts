/**
 * fal.ai model IDs by generation mode and price tier (Hızlı / Standart / Premium).
 */
export type GenerationMode = 'text-to-image' | 'image-to-image' | 'image-to-video';

export type ModelTier = 'fast' | 'standard' | 'premium';

const REGISTRY: Record<GenerationMode, Record<ModelTier, string>> = {
  'text-to-image': {
    fast: 'fal-ai/imagen3/fast',
    standard: 'fal-ai/imagen3',
    premium: 'fal-ai/flux-2-pro',
  },
  'image-to-image': {
    fast: 'fal-ai/nano-banana/edit',
    standard: 'fal-ai/flux-pro/kontext/max/multi',
    premium: 'fal-ai/nano-banana-pro/edit',
  },
  'image-to-video': {
    fast: 'fal-ai/kling-video/v2.1/standard/image-to-video',
    standard: 'fal-ai/kling-video/v2.1/pro/image-to-video',
    premium: 'fal-ai/kling-video/v2.1/master/image-to-video',
  },
};

export function resolveModelId(mode: GenerationMode, tier: ModelTier): string {
  return REGISTRY[mode][tier];
}

export function supportsKlingAspectRatio(modelId: string): boolean {
  return (
    modelId.includes('/pro/image-to-video') ||
    modelId.includes('/master/image-to-video')
  );
}

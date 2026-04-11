/**
 * fal.ai model IDs: tier defaults + full allowlist for optional `falModelId` on generate.
 */
export type GenerationMode = 'text-to-image' | 'image-to-image' | 'image-to-video';

export type ModelTier = 'fast' | 'standard' | 'premium';

/** All supported text-to-image endpoints. */
export const MODEL_IDS_TEXT_TO_IMAGE = [
  'fal-ai/nano-banana',
  'fal-ai/imagen3/fast',
  'fal-ai/nano-banana-2',
  'fal-ai/imagen3',
  'fal-ai/recraft/v4/text-to-image',
  'fal-ai/nano-banana-pro',
  'fal-ai/imagen4/preview/ultra',
  'fal-ai/flux-2-pro',
] as const;

/** All supported image-to-image (edit) endpoints. */
export const MODEL_IDS_IMAGE_TO_IMAGE = [
  'fal-ai/gemini-3.1-flash-image-preview/edit',
  'fal-ai/nano-banana/edit',
  'fal-ai/flux-pro/kontext/max/multi',
  'fal-ai/nano-banana-2/edit',
  'fal-ai/kling-image/o3/image-to-image',
  'fal-ai/nano-banana-pro/edit',
  'fal-ai/flux-2-pro/edit',
] as const;

/** All supported image-to-video endpoints. */
export const MODEL_IDS_IMAGE_TO_VIDEO = [
  'fal-ai/kling-video/v2.1/standard/image-to-video',
  'fal-ai/pixverse/v3.5/image-to-video/fast',
  'fal-ai/kling-video/v2.1/pro/image-to-video',
  'fal-ai/sora-2/image-to-video',
  'fal-ai/veo3.1/fast/image-to-video',
  'fal-ai/sora-2/image-to-video/pro',
  'fal-ai/kling-video/v2.1/master/image-to-video',
  'fal-ai/veo3.1/image-to-video',
] as const;

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

const ALLOWED_SET: Record<GenerationMode, Set<string>> = {
  'text-to-image': new Set(MODEL_IDS_TEXT_TO_IMAGE),
  'image-to-image': new Set(MODEL_IDS_IMAGE_TO_IMAGE),
  'image-to-video': new Set(MODEL_IDS_IMAGE_TO_VIDEO),
};

export function resolveModelId(mode: GenerationMode, tier: ModelTier): string {
  return REGISTRY[mode][tier];
}

/**
 * When `falModelId` is set and allowed for `mode`, use it; otherwise tier default.
 */
export function resolveFinalModelId(
  mode: GenerationMode,
  tier: ModelTier,
  falModelId?: string | null,
): string {
  if (falModelId && ALLOWED_SET[mode].has(falModelId)) {
    return falModelId;
  }
  return resolveModelId(mode, tier);
}

export function isFalModelAllowedForMode(
  mode: GenerationMode,
  falModelId: string,
): boolean {
  return ALLOWED_SET[mode].has(falModelId);
}

export function listModelsByMode(): Record<
  GenerationMode,
  readonly string[]
> {
  return {
    'text-to-image': MODEL_IDS_TEXT_TO_IMAGE,
    'image-to-image': MODEL_IDS_IMAGE_TO_IMAGE,
    'image-to-video': MODEL_IDS_IMAGE_TO_VIDEO,
  };
}

export function supportsKlingAspectRatio(modelId: string): boolean {
  return (
    modelId.includes('/pro/image-to-video') ||
    modelId.includes('/master/image-to-video')
  );
}

export function isKlingImageToVideo(modelId: string): boolean {
  return modelId.includes('kling-video') && modelId.includes('image-to-video');
}

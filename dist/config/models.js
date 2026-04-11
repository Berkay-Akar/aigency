"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveModelId = resolveModelId;
exports.supportsKlingAspectRatio = supportsKlingAspectRatio;
const REGISTRY = {
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
function resolveModelId(mode, tier) {
    return REGISTRY[mode][tier];
}
function supportsKlingAspectRatio(modelId) {
    return (modelId.includes('/pro/image-to-video') ||
        modelId.includes('/master/image-to-video'));
}
//# sourceMappingURL=models.js.map
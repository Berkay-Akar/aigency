"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAiGeneration = runAiGeneration;
const client_1 = require("@fal-ai/client");
const env_1 = require("../../config/env");
const models_1 = require("../../config/models");
let falConfigured = false;
function ensureFalConfigured() {
    if (!falConfigured) {
        client_1.fal.config({ credentials: env_1.env.FAL_API_KEY });
        falConfigured = true;
    }
}
function imagenAspectFromPreset(preset, customWidth, customHeight) {
    if (preset === 'portrait')
        return '9:16';
    if (preset === 'landscape')
        return '16:9';
    if (preset === 'square')
        return '1:1';
    const w = customWidth ?? 1024;
    const h = customHeight ?? 1024;
    const r = w / h;
    const candidates = [
        { v: '1:1', ratio: 1 },
        { v: '16:9', ratio: 16 / 9 },
        { v: '9:16', ratio: 9 / 16 },
        { v: '4:3', ratio: 4 / 3 },
        { v: '3:4', ratio: 3 / 4 },
    ];
    let best = candidates[0];
    let bestDiff = Math.abs(r - best.ratio);
    for (const c of candidates) {
        const d = Math.abs(r - c.ratio);
        if (d < bestDiff) {
            best = c;
            bestDiff = d;
        }
    }
    return best.v;
}
function kontextAspectFromPreset(preset) {
    if (preset === 'portrait')
        return '9:16';
    if (preset === 'landscape')
        return '16:9';
    if (preset === 'square')
        return '1:1';
    return '16:9';
}
function nanoAspectFromPreset(preset) {
    if (preset === 'custom')
        return 'auto';
    if (preset === 'portrait')
        return '9:16';
    if (preset === 'landscape')
        return '16:9';
    return '1:1';
}
function fluxImageSizeFromPreset(preset, customWidth, customHeight) {
    if (preset === 'custom' && customWidth != null && customHeight != null) {
        return {
            width: Math.min(2048, Math.max(256, customWidth)),
            height: Math.min(2048, Math.max(256, customHeight)),
        };
    }
    if (preset === 'portrait')
        return 'portrait_16_9';
    if (preset === 'landscape')
        return 'landscape_16_9';
    return 'square_hd';
}
function fluxOutputFormat(fmt) {
    return fmt === 'png' ? 'png' : 'jpeg';
}
function klingAspectFromPreset(preset) {
    if (preset === 'portrait')
        return '9:16';
    if (preset === 'landscape')
        return '16:9';
    return '1:1';
}
function pickImageFromData(data) {
    const d = data;
    const img = d.images?.[0];
    if (!img?.url) {
        throw new Error('fal.ai returned no images');
    }
    return img;
}
function pickVideoFromData(data) {
    const d = data;
    const v = d.video;
    if (!v?.url) {
        throw new Error('fal.ai returned no video');
    }
    return {
        url: v.url,
        contentType: v.content_type ?? 'video/mp4',
    };
}
async function falSubscribe(modelId, input) {
    ensureFalConfigured();
    const result = await client_1.fal.subscribe(modelId, {
        input,
        logs: false,
    });
    return result.data;
}
function buildTextToImageInput(modelId, prompt, aspectRatio, customWidth, customHeight, outputFormat) {
    if (modelId.includes('imagen3')) {
        const ar = imagenAspectFromPreset(aspectRatio, customWidth, customHeight);
        let p = prompt;
        if (aspectRatio === 'custom' && customWidth && customHeight) {
            p = `${p}\n\n(Target composition ~${customWidth}x${customHeight}px.)`;
        }
        return {
            prompt: p,
            aspect_ratio: ar,
            num_images: 1,
        };
    }
    if (modelId.includes('flux-2-pro')) {
        const image_size = fluxImageSizeFromPreset(aspectRatio, customWidth, customHeight);
        return {
            prompt,
            image_size,
            output_format: fluxOutputFormat(outputFormat),
            enable_safety_checker: true,
        };
    }
    throw new Error(`Unsupported text-to-image model: ${modelId}`);
}
function buildImageToImageInput(modelId, prompt, imageUrls, aspectRatio, outputFormat) {
    if (modelId.includes('nano-banana')) {
        return {
            prompt,
            image_urls: imageUrls,
            aspect_ratio: nanoAspectFromPreset(aspectRatio),
            output_format: outputFormat,
            resolution: '1K',
            num_images: 1,
            limit_generations: true,
        };
    }
    if (modelId.includes('kontext')) {
        return {
            prompt,
            image_urls: imageUrls,
            aspect_ratio: kontextAspectFromPreset(aspectRatio),
            output_format: fluxOutputFormat(outputFormat),
            num_images: 1,
            safety_tolerance: '2',
        };
    }
    throw new Error(`Unsupported image-to-image model: ${modelId}`);
}
function buildImageToVideoInput(modelId, prompt, imageUrl, duration, aspectRatio) {
    const input = {
        prompt,
        image_url: imageUrl,
        duration: String(duration),
    };
    if ((0, models_1.supportsKlingAspectRatio)(modelId)) {
        input.aspect_ratio = klingAspectFromPreset(aspectRatio);
    }
    return input;
}
/**
 * Single entry used by the worker: routes to the correct fal model input shape.
 */
async function runAiGeneration(params) {
    const { mode, modelId, prompt, imageUrls, aspectRatio, customWidth, customHeight, outputFormat, duration, } = params;
    if (mode === 'text-to-image') {
        const input = buildTextToImageInput(modelId, prompt, aspectRatio, customWidth, customHeight, outputFormat);
        const data = await falSubscribe(modelId, input);
        const img = pickImageFromData(data);
        return {
            url: img.url,
            status: 'completed',
            width: img.width,
            height: img.height,
            contentType: img.content_type ?? 'image/png',
        };
    }
    if (mode === 'image-to-image') {
        const input = buildImageToImageInput(modelId, prompt, imageUrls, aspectRatio, outputFormat);
        const data = await falSubscribe(modelId, input);
        const img = pickImageFromData(data);
        return {
            url: img.url,
            status: 'completed',
            width: img.width,
            height: img.height,
            contentType: img.content_type ?? 'image/png',
        };
    }
    if (mode === 'image-to-video') {
        const imageUrl = imageUrls[0];
        if (!imageUrl) {
            throw new Error('image-to-video requires at least one image URL');
        }
        const input = buildImageToVideoInput(modelId, prompt, imageUrl, duration, aspectRatio);
        const data = await falSubscribe(modelId, input);
        const vid = pickVideoFromData(data);
        return {
            url: vid.url,
            status: 'completed',
            contentType: vid.contentType,
        };
    }
    throw new Error(`Unsupported generation mode: ${mode}`);
}
//# sourceMappingURL=ai.service.js.map
import {
  PRODUCT_ANGLE_PROMPTS,
  STYLE_MODE_DESCRIPTIONS,
  VIDEO_PLATFORM_PROMPTS,
  VIDEO_PLATFORM_ASPECT,
} from "../../config/product-generation";
import type { StyleMode, VideoPlatform } from "../../config/product-generation";
import { RESOLUTION_CONFIG } from "../../config/model-photo";
import type { Resolution } from "../../config/model-photo";

export interface ProductPromptResult {
  prompt: string;
  width: number;
  height: number;
  aspectRatio: string;
}

export function buildProductAnglePrompt(
  angleIndex: 0 | 1 | 2,
  resolution: Resolution,
  customPrompt?: string,
): ProductPromptResult {
  const base = PRODUCT_ANGLE_PROMPTS[angleIndex];
  const extra = customPrompt ? ` ${customPrompt}` : "";
  const { width, height } = RESOLUTION_CONFIG[resolution].square;
  return {
    prompt: `${base}.${extra}`.trim(),
    width,
    height,
    aspectRatio: "square",
  };
}

export function buildProductReferencePrompt(
  styleMode: StyleMode,
  resolution: Resolution,
  customPrompt?: string,
): ProductPromptResult {
  const styleDesc = STYLE_MODE_DESCRIPTIONS[styleMode];
  const extra = customPrompt ? ` ${customPrompt}` : "";
  const prompt = [
    `Apply the photographic style, lighting, and composition from the reference image to the product image.`,
    `Preserve the product's exact design, colors, and branding.`,
    `${styleDesc}.`,
    `Professional fashion photography, commercial quality, social media ready.${extra}`,
  ]
    .join(" ")
    .trim();
  const { width, height } = RESOLUTION_CONFIG[resolution].square;
  return { prompt, width, height, aspectRatio: "square" };
}

export function buildPhotoToVideoPrompt(
  platform: VideoPlatform,
  customPrompt?: string,
): { prompt: string; aspectRatio: string } {
  const platformDesc = VIDEO_PLATFORM_PROMPTS[platform];
  const extra = customPrompt ? ` ${customPrompt}` : "";
  return {
    prompt: `${platformDesc}.${extra}`.trim(),
    aspectRatio: VIDEO_PLATFORM_ASPECT[platform],
  };
}

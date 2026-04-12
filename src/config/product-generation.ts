export const STYLE_MODE_OPTIONS = ["minimal", "bold"] as const;
export type StyleMode = (typeof STYLE_MODE_OPTIONS)[number];

export const VIDEO_PLATFORM_OPTIONS = [
  "instagram",
  "tiktok",
  "general",
] as const;
export type VideoPlatform = (typeof VIDEO_PLATFORM_OPTIONS)[number];

// ─── Product Angle Prompts ─────────────────────────────────────────────────────
// Three preset professional product photography angles generated in order:
// [0] front-facing, [1] 45-degree three-quarter, [2] elevated/side-profile

export const PRODUCT_ANGLE_PROMPTS = [
  "Professional product photography, front-facing flat view, clean white seamless background, even soft-box studio lighting, sharp commercial quality, e-commerce ready, ultra detailed",
  "Professional product photography, 45-degree three-quarter angle view, clean white seamless background, dramatic studio lighting with elegant cast shadow, sharp commercial quality, e-commerce ready",
  "Professional product photography, elevated overhead or side-profile angle, clean white seamless background, minimal high-key studio lighting, sharp commercial quality, e-commerce ready",
] as const;

// ─── Style Mode Descriptions ───────────────────────────────────────────────────

export const STYLE_MODE_DESCRIPTIONS: Record<StyleMode, string> = {
  minimal:
    "minimal clean aesthetic, soft diffused studio lighting, white or light neutral background, refined and elegant composition",
  bold: "bold editorial aesthetic, high-contrast dramatic lighting, creative dynamic composition, magazine-quality visual impact",
};

// ─── Video Platform Prompts ────────────────────────────────────────────────────

export const VIDEO_PLATFORM_PROMPTS: Record<VideoPlatform, string> = {
  instagram:
    "smooth cinematic camera movement, elegant slow dolly or parallax depth effect, aesthetic and polished motion, professional commercial video, Instagram-ready social content",
  tiktok:
    "dynamic and energetic camera motion, engaging visual movement, trendy and vibrant commercial video, TikTok-ready social content",
  general:
    "smooth professional cinematic motion, versatile wide-appeal composition, clean commercial advertising video quality",
};

export const VIDEO_PLATFORM_ASPECT: Record<VideoPlatform, string> = {
  instagram: "portrait",
  tiktok: "portrait",
  general: "square",
};

// ─── Credit Costs ──────────────────────────────────────────────────────────────

export const VIDEO_DURATION_CREDITS: Record<number, number> = {
  5: 50,
  10: 100,
};

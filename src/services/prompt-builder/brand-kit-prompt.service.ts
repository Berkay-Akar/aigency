import type { BrandKit, BrandTone } from "@prisma/client";

const TONE_DESCRIPTORS: Record<BrandTone, string> = {
  PROFESSIONAL: "professional, polished, corporate-grade",
  LUXURY: "luxury, high-end, premium, exclusive",
  CASUAL: "casual, approachable, relaxed, everyday",
  BOLD: "bold, striking, high-contrast, daring",
  MINIMALIST: "minimalist, clean, refined, less-is-more",
  PLAYFUL: "playful, vibrant, fun, energetic",
};

function tonePhrase(tone: BrandTone | null): string {
  return tone ? `Brand visual tone: ${TONE_DESCRIPTORS[tone]}.` : "";
}

function colorPhrase(kit: BrandKit): string {
  const colors = [kit.primaryColor, kit.secondaryColor, kit.accentColor].filter(
    Boolean,
  );
  return colors.length ? `Brand color palette: ${colors.join(", ")}.` : "";
}

function identityPhrase(kit: BrandKit): string {
  const parts: string[] = [];
  if (kit.brandName) parts.push(`Brand: ${kit.brandName}`);
  if (kit.tagline) parts.push(`"${kit.tagline}"`);
  if (kit.industry) parts.push(`Industry: ${kit.industry}`);
  if (kit.description) parts.push(kit.description);
  return parts.join(". ");
}

function buildSuffix(...phrases: string[]): string {
  const meaningful = phrases.filter(Boolean);
  return meaningful.length ? ` ${meaningful.join(" ")}` : "";
}

// ─── Route-specific suffixes ──────────────────────────────────────────────────

/**
 * Ghost-mannequin: hint the preferred background color and aesthetic from the brand kit.
 */
export function buildGhostMannequinBrandSuffix(kit: BrandKit): string {
  const parts: string[] = [];
  if (kit.primaryColor)
    parts.push(
      `Prefer a background tone aligned with the brand primary color: ${kit.primaryColor}.`,
    );
  parts.push(tonePhrase(kit.tone));
  if (kit.brandName) parts.push(`This is for the ${kit.brandName} brand.`);
  return buildSuffix(...parts);
}

/**
 * Model-photo: inject brand identity + tone into the fashion photography style.
 */
export function buildModelPhotoBrandSuffix(kit: BrandKit): string {
  const parts: string[] = [];
  parts.push(tonePhrase(kit.tone));
  parts.push(identityPhrase(kit));
  parts.push(colorPhrase(kit));
  if (kit.tone)
    parts.push(
      `The overall aesthetic must reflect the brand's ${TONE_DESCRIPTORS[kit.tone]} visual identity.`,
    );
  return buildSuffix(...parts);
}

/**
 * Product-swap: embed scene aesthetic and visual language from the brand kit.
 */
export function buildProductSwapBrandSuffix(kit: BrandKit): string {
  const parts: string[] = [];
  parts.push(tonePhrase(kit.tone));
  if (kit.brandName)
    parts.push(
      `Ensure the scene aligns with the ${kit.brandName} brand visual language.`,
    );
  parts.push(colorPhrase(kit));
  if (kit.description) parts.push(`Brand context: ${kit.description}`);
  return buildSuffix(...parts);
}

/**
 * Product-angles: specify brand photography style and color palette for studio shots.
 */
export function buildProductAnglesBrandSuffix(kit: BrandKit): string {
  const parts: string[] = [];
  parts.push(tonePhrase(kit.tone));
  parts.push(colorPhrase(kit));
  if (kit.tagline) parts.push(`Brand tagline for reference: "${kit.tagline}".`);
  if (kit.tone)
    parts.push(`Photography style must be ${TONE_DESCRIPTORS[kit.tone]}.`);
  return buildSuffix(...parts);
}

/**
 * Product-reference: align style reference and mood with the brand kit.
 */
export function buildProductReferenceBrandSuffix(kit: BrandKit): string {
  const parts: string[] = [];
  parts.push(tonePhrase(kit.tone));
  parts.push(identityPhrase(kit));
  parts.push(colorPhrase(kit));
  if (kit.tone)
    parts.push(
      `Style the result consistent with a ${TONE_DESCRIPTORS[kit.tone]} brand mood.`,
    );
  return buildSuffix(...parts);
}

/**
 * Photo-to-video: guide motion tone and brand energy for the video output.
 */
export function buildPhotoToVideoBrandSuffix(kit: BrandKit): string {
  const parts: string[] = [];
  if (kit.tone) parts.push(`Motion tone: ${TONE_DESCRIPTORS[kit.tone]}.`);
  if (kit.brandName)
    parts.push(`Video aesthetic aligned with ${kit.brandName}.`);
  if (kit.tagline) parts.push(`Brand energy: "${kit.tagline}".`);
  parts.push(colorPhrase(kit));
  return buildSuffix(...parts);
}

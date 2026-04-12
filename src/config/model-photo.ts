// ─── Enum Option Arrays ────────────────────────────────────────────────────────

export const GENDER_OPTIONS = ["female", "male", "non-binary"] as const;
export type Gender = (typeof GENDER_OPTIONS)[number];

export const ETHNICITY_OPTIONS = [
  "international",
  "european",
  "asian",
  "african",
  "latin-american",
  "middle-eastern",
  "south-asian",
] as const;
export type Ethnicity = (typeof ETHNICITY_OPTIONS)[number];

export const AGE_RANGE_OPTIONS = [
  "young-adult",
  "adult",
  "mature",
  "senior",
] as const;
export type AgeRange = (typeof AGE_RANGE_OPTIONS)[number];

export const SKIN_COLOR_OPTIONS = ["light", "medium", "tan", "dark"] as const;
export type SkinColor = (typeof SKIN_COLOR_OPTIONS)[number];

export const FACE_TYPE_OPTIONS = [
  "angular-bony",
  "soft-round",
  "oval",
  "heart-shaped",
] as const;
export type FaceType = (typeof FACE_TYPE_OPTIONS)[number];

export const EYE_COLOR_OPTIONS = [
  "dark-brown",
  "light-brown",
  "blue",
  "green",
  "hazel",
] as const;
export type EyeColor = (typeof EYE_COLOR_OPTIONS)[number];

export const EXPRESSION_OPTIONS = [
  "soft-neutral",
  "confident",
  "joyful",
  "serious",
] as const;
export type Expression = (typeof EXPRESSION_OPTIONS)[number];

export const HAIR_COLOR_OPTIONS = [
  "dark-brown",
  "light-brown",
  "black",
  "blonde",
  "auburn",
  "grey",
] as const;
export type HairColor = (typeof HAIR_COLOR_OPTIONS)[number];

export const HAIRSTYLE_OPTIONS = [
  "natural-afro",
  "straight-long",
  "wavy-medium",
  "ponytail",
  "bun",
  "pixie-cut",
  "braids",
  "curly-bob",
] as const;
export type Hairstyle = (typeof HAIRSTYLE_OPTIONS)[number];

export const BODY_SIZE_OPTIONS = ["xs", "s", "m", "l", "xl"] as const;
export type BodySize = (typeof BODY_SIZE_OPTIONS)[number];

export const SHOT_TYPE_OPTIONS = [
  "full-body",
  "three-quarters",
  "upper-body",
  "product",
] as const;
export type ShotType = (typeof SHOT_TYPE_OPTIONS)[number];

export const RESOLUTION_OPTIONS = ["1K", "2K"] as const;
export type Resolution = (typeof RESOLUTION_OPTIONS)[number];

// ─── Prompt Description Maps ───────────────────────────────────────────────────

export const ETHNICITY_DESCRIPTIONS: Record<Ethnicity, string> = {
  international: "mixed international",
  european: "European",
  asian: "East Asian",
  african: "African",
  "latin-american": "Latin American",
  "middle-eastern": "Middle Eastern",
  "south-asian": "South Asian",
};

export const AGE_RANGE_DESCRIPTIONS: Record<AgeRange, string> = {
  "young-adult": "young adult",
  adult: "adult",
  mature: "mature adult",
  senior: "senior adult",
};

export const SKIN_COLOR_DESCRIPTIONS: Record<SkinColor, string> = {
  light: "light",
  medium: "medium",
  tan: "tan",
  dark: "dark",
};

export const FACE_TYPE_DESCRIPTIONS: Record<FaceType, string> = {
  "angular-bony": "angular and defined",
  "soft-round": "soft and round",
  oval: "oval and balanced",
  "heart-shaped": "heart-shaped",
};

export const EYE_COLOR_DESCRIPTIONS: Record<EyeColor, string> = {
  "dark-brown": "dark brown",
  "light-brown": "light brown",
  blue: "blue",
  green: "green",
  hazel: "hazel",
};

export const EXPRESSION_DESCRIPTIONS: Record<Expression, string> = {
  "soft-neutral":
    "soft neutral expression, calm composed face with subtle hint of warmth, natural relaxed",
  confident:
    "confident expression, strong direct gaze, poised and self-assured",
  joyful:
    "warm joyful expression, natural genuine smile, bright and approachable",
  serious: "serious composed expression, focused gaze, professional demeanor",
};

export const HAIR_COLOR_DESCRIPTIONS: Record<HairColor, string> = {
  "dark-brown": "dark brown",
  "light-brown": "light brown",
  black: "jet black",
  blonde: "blonde",
  auburn: "auburn",
  grey: "silver grey",
};

export const HAIRSTYLE_DESCRIPTIONS: Record<Hairstyle, string> = {
  "natural-afro":
    "natural afro texture, voluminous natural curls with definition",
  "straight-long": "straight long hair, sleek and smooth flowing down",
  "wavy-medium": "wavy medium length hair with natural wave texture",
  ponytail: "neat ponytail, hair pulled back cleanly",
  bun: "elegant bun, hair up in a neat sophisticated updo",
  "pixie-cut": "short pixie cut, cropped close with styling",
  braids: "braided hair, neatly braided style with texture",
  "curly-bob": "curly bob, short curly hair with volume and bounce",
};

export const SHOT_TYPE_DESCRIPTIONS: Record<ShotType, string> = {
  "full-body": "full body",
  "three-quarters": "three-quarter length (waist to head)",
  "upper-body": "upper body (chest up)",
  product: "product focused",
};

// ─── Resolution Config ─────────────────────────────────────────────────────────

export interface ResolutionDimensions {
  portrait: { width: number; height: number };
  square: { width: number; height: number };
  creditsCost: number;
}

export const RESOLUTION_CONFIG: Record<Resolution, ResolutionDimensions> = {
  "1K": {
    portrait: { width: 768, height: 1024 },
    square: { width: 1024, height: 1024 },
    creditsCost: 10,
  },
  "2K": {
    portrait: { width: 1536, height: 2048 },
    square: { width: 2048, height: 2048 },
    creditsCost: 25,
  },
};

// ─── Frontend Options Object ───────────────────────────────────────────────────
// Returned by GET /ai/model-photo/options so the frontend can populate dropdowns.

export const MODEL_PHOTO_OPTIONS = {
  genders: GENDER_OPTIONS,
  ethnicities: ETHNICITY_OPTIONS,
  ageRanges: AGE_RANGE_OPTIONS,
  skinColors: SKIN_COLOR_OPTIONS,
  faceTypes: FACE_TYPE_OPTIONS,
  eyeColors: EYE_COLOR_OPTIONS,
  expressions: EXPRESSION_OPTIONS,
  hairColors: HAIR_COLOR_OPTIONS,
  hairstyles: HAIRSTYLE_OPTIONS,
  bodySizes: BODY_SIZE_OPTIONS,
  shotTypes: SHOT_TYPE_OPTIONS,
  resolutions: RESOLUTION_OPTIONS,
  resolutionCredits: {
    "1K": RESOLUTION_CONFIG["1K"].creditsCost,
    "2K": RESOLUTION_CONFIG["2K"].creditsCost,
  },
} as const;

import { z } from "zod";
import {
  GENDER_OPTIONS,
  ETHNICITY_OPTIONS,
  AGE_RANGE_OPTIONS,
  SKIN_COLOR_OPTIONS,
  FACE_TYPE_OPTIONS,
  EYE_COLOR_OPTIONS,
  EXPRESSION_OPTIONS,
  HAIR_COLOR_OPTIONS,
  HAIRSTYLE_OPTIONS,
  BODY_SIZE_OPTIONS,
  SHOT_TYPE_OPTIONS,
  RESOLUTION_OPTIONS,
} from "../../config/model-photo";

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

export const ModelDetailsSchema = z.object({
  gender: z.enum(GENDER_OPTIONS),
  ethnicity: z.enum(ETHNICITY_OPTIONS),
  age: z.enum(AGE_RANGE_OPTIONS),
  skinColor: z.enum(SKIN_COLOR_OPTIONS),
  faceType: z.enum(FACE_TYPE_OPTIONS),
  eyeColor: z.enum(EYE_COLOR_OPTIONS),
  expression: z.enum(EXPRESSION_OPTIONS),
});

// Full customization for with-model mode (includes body/hair info)
export const FullCustomizationSchema = z.object({
  bodySize: z.enum(BODY_SIZE_OPTIONS),
  height: z.number().int().min(150).max(195),
  hairColor: z.enum(HAIR_COLOR_OPTIONS),
  hairstyle: z.enum(HAIRSTYLE_OPTIONS),
  shotType: z.enum(SHOT_TYPE_OPTIONS),
});

// ─── Base fields shared by both styleMode variants ────────────────────────────
const BaseFieldsSchema = z.object({
  productImageUrls: z
    .array(z.string().url("Each product URL must be a valid URL"))
    .min(1, "At least one product image is required")
    .max(4, "Maximum 4 product images allowed"),
  resolution: z.enum(RESOLUTION_OPTIONS).default("1K"),
  customPrompt: z
    .string()
    .max(500, "Custom prompt must be 500 characters or fewer")
    .optional(),
  modelTier: z.enum(["fast", "standard", "premium"]).default("standard"),
  outputFormat: z.enum(["png", "jpeg", "webp"]).default("webp"),
});

// ─── Discriminated variants ────────────────────────────────────────────────────

const WithModelVariant = z.object({
  styleMode: z.literal("with-model"),
  modelDetails: ModelDetailsSchema,
  customization: FullCustomizationSchema,
});

const ProductOnlyVariant = z.object({
  styleMode: z.literal("product-only"),
  // Only shotType is needed for product-only: determines portrait vs square aspect ratio
  shotType: z.enum(SHOT_TYPE_OPTIONS),
});

// ─── Combined schema ──────────────────────────────────────────────────────────

export const ModelPhotoSchema = z
  .discriminatedUnion("styleMode", [WithModelVariant, ProductOnlyVariant])
  .and(BaseFieldsSchema);

export type ModelPhotoInput = z.infer<typeof ModelPhotoSchema>;
export type ModelDetails = z.infer<typeof ModelDetailsSchema>;
export type FullCustomization = z.infer<typeof FullCustomizationSchema>;

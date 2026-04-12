import {
  ETHNICITY_DESCRIPTIONS,
  AGE_RANGE_DESCRIPTIONS,
  SKIN_COLOR_DESCRIPTIONS,
  FACE_TYPE_DESCRIPTIONS,
  EYE_COLOR_DESCRIPTIONS,
  EXPRESSION_DESCRIPTIONS,
  HAIR_COLOR_DESCRIPTIONS,
  HAIRSTYLE_DESCRIPTIONS,
  SHOT_TYPE_DESCRIPTIONS,
  RESOLUTION_CONFIG,
} from "../../config/model-photo";
import type { ModelPhotoInput } from "../../modules/ai/model-photo.schema";

export interface ModelPhotoPromptResult {
  prompt: string;
  aspectRatio: string;
  width: number;
  height: number;
}

// full-body and three-quarters shots use portrait (taller) dimensions
const PORTRAIT_SHOT_TYPES = new Set(["full-body", "three-quarters"]);

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function buildModelPhotoPrompt(
  input: ModelPhotoInput,
): ModelPhotoPromptResult {
  const { resolution, customPrompt } = input;

  // Determine shotType from the correct field depending on styleMode
  const shotType =
    input.styleMode === "with-model"
      ? input.customization.shotType
      : input.shotType;

  const isPortrait = PORTRAIT_SHOT_TYPES.has(shotType);
  const resConfig = RESOLUTION_CONFIG[resolution];
  const dimensions = isPortrait ? resConfig.portrait : resConfig.square;
  const aspectRatio = isPortrait ? "portrait" : "square";

  const shotDesc = SHOT_TYPE_DESCRIPTIONS[shotType];
  const customExtra = customPrompt ? ` ${customPrompt}` : "";

  let prompt: string;

  if (input.styleMode === "with-model") {
    const { modelDetails, customization } = input;
    const ageDesc = AGE_RANGE_DESCRIPTIONS[modelDetails.age];
    const ethnicityDesc = ETHNICITY_DESCRIPTIONS[modelDetails.ethnicity];
    const genderDesc =
      modelDetails.gender === "non-binary"
        ? "non-binary person"
        : modelDetails.gender;
    const skinDesc = SKIN_COLOR_DESCRIPTIONS[modelDetails.skinColor];
    const eyeDesc = EYE_COLOR_DESCRIPTIONS[modelDetails.eyeColor];
    const faceDesc = FACE_TYPE_DESCRIPTIONS[modelDetails.faceType];
    const expressionDesc = EXPRESSION_DESCRIPTIONS[modelDetails.expression];
    const hairstyleDesc = HAIRSTYLE_DESCRIPTIONS[customization.hairstyle];
    const hairColorDesc = HAIR_COLOR_DESCRIPTIONS[customization.hairColor];

    prompt = [
      `A ${ageDesc} ${ethnicityDesc} ${genderDesc}`,
      `with ${skinDesc} skin, ${eyeDesc} eyes, ${faceDesc} facial features,`,
      `and ${expressionDesc}.`,
      `${capitalize(hairstyleDesc)} in ${hairColorDesc} color.`,
      `Wearing the clothing from the provided product image.`,
      `Body size ${customization.bodySize.toUpperCase()}, approximately ${customization.height}cm tall.`,
      `${capitalize(shotDesc)} shot.`,
      `Professional fashion photography, clean background, commercial quality, sharp details, ready for social media advertising.${customExtra}`,
    ].join(" ");
  } else {
    prompt = [
      `Professional product photography.`,
      `Clean minimal background, dramatic studio lighting,`,
      `showcasing the product from flattering angles.`,
      `${capitalize(shotDesc)} shot.`,
      `Commercial quality, ultra sharp details, ready for social media advertising.${customExtra}`,
    ].join(" ");
  }

  return { prompt, aspectRatio, ...dimensions };
}

/**
 * Ghost mannequin (decupe) generation config.
 *
 * Standard quality: single call to bria/fibo-edit/edit with a fixed prompt.
 * Premium quality : two sequential fal calls —
 *   1. fal-ai/bria/background/remove  (strip background)
 *   2. fal-ai/bria/fibo-edit/edit      (ghost mannequin with clean input)
 */

export const GHOST_MANNEQUIN_FAL_MODELS = {
  /** Ghost mannequin edit model (used in both tiers) */
  ghostEdit: "bria/fibo-edit/edit",
  /** Background removal model (premium tier first step) */
  bgRemove: "fal-ai/bria/background/remove",
} as const;

export const GHOST_MANNEQUIN_CREDIT_COST: Record<
  "standard" | "premium",
  number
> = {
  standard: 20,
  premium: 40,
};

/**
 * Builds the ghost-mannequin prompt with an interpolated background color.
 * @param backgroundColor e.g. "white", "light grey", "soft beige"
 */
export function buildGhostMannequinPrompt(backgroundColor: string): string {
  return `Ghost mannequin effect: remove the human model from the clothing photo, keep the garment's exact shape, structure, and details as if worn by an invisible mannequin. The background should be solid ${backgroundColor}. Preserve all fabric textures, stitching, labels, and original garment proportions. Output a clean, professional e-commerce product image.`;
}

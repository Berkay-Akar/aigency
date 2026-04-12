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
  ghostEdit: "fal-ai/bria/fibo-edit/edit",
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
  return (
    `Remove the human model completely and transform the garment into a clean ghost mannequin ` +
    `product photo. Reconstruct the clothing as if worn by an invisible mannequin, preserving ` +
    `the exact shape, drape and structure of the fabric. Place the garment on a smooth plain ` +
    `${backgroundColor} studio background. Maintain professional product photography quality ` +
    `with clean edges, realistic fabric texture, and even studio lighting.`
  );
}

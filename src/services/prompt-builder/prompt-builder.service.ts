import OpenAI from 'openai';
import { env } from '../../config/env';
import type { GenerationMode } from '../../config/models';

const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 1024;
const TIMEOUT_MS = 30_000;

export function isOpenAiConfigured(): boolean {
  return env.OPENAI_API_KEY.length > 0;
}

function modeDescription(mode: GenerationMode): string {
  switch (mode) {
    case 'text-to-image':
      return 'text-to-image generation (describe the final still image)';
    case 'image-to-image':
      return 'image editing / image-to-image (describe the desired change while preserving subject identity)';
    case 'image-to-video':
      return 'image-to-video (describe motion, camera, and atmosphere; the start frame is provided separately)';
  }
}

function buildSystemPrompt(mode: GenerationMode): string {
  const task = modeDescription(mode);
  return `You are an expert prompt engineer for ${task}.
Improve the user's prompt: add concrete visual detail, lighting, composition, and style where helpful. Keep the user's intent and primary language.
Do not add explanations, markdown, or quotation marks.
Output ONLY the final prompt as a single plain-text paragraph.`;
}

/**
 * Optional GPT step when the user enables "promptumu güzelleştir".
 */
export async function enhanceGenerationPrompt(
  rawPrompt: string,
  mode: GenerationMode,
): Promise<string> {
  if (!isOpenAiConfigured()) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const completion = await client.chat.completions.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.65,
        messages: [
          { role: 'system', content: buildSystemPrompt(mode) },
          { role: 'user', content: rawPrompt },
        ],
      },
      { signal: controller.signal },
    );

    clearTimeout(timeout);

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new Error('OpenAI returned an empty prompt');
    }
    return text;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS = 1024;
const TIMEOUT_MS = 30_000;

export interface PromptContext {
  platform: 'instagram' | 'tiktok' | 'general';
  style?: string;
  targetAudience?: string;
  tone?: 'professional' | 'casual' | 'humorous' | 'inspirational';
}

export interface OptimizedPrompt {
  imagePrompt: string;
  caption: string;
  hashtags: string[];
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export async function optimizePrompt(
  rawPrompt: string,
  context: PromptContext,
): Promise<OptimizedPrompt> {
  const systemPrompt = buildSystemPrompt(context);
  const userMessage = `Raw prompt: "${rawPrompt}"\n\nGenerate an optimized image prompt and social media caption for ${context.platform}.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    clearTimeout(timeout);

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    return parseResponse(text, message.usage.input_tokens, message.usage.output_tokens);
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

function buildSystemPrompt(context: PromptContext): string {
  return `You are an expert social media content creator and AI image prompt engineer.
Platform: ${context.platform}
Tone: ${context.tone ?? 'casual'}
${context.style ? `Visual style: ${context.style}` : ''}
${context.targetAudience ? `Target audience: ${context.targetAudience}` : ''}

Respond ONLY with a valid JSON object in this exact shape:
{
  "imagePrompt": "<detailed fal.ai compatible image generation prompt>",
  "caption": "<engaging social media caption>",
  "hashtags": ["hashtag1", "hashtag2"]
}`;
}

function parseResponse(text: string, inputTokens: number, outputTokens: number): OptimizedPrompt {
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('Claude response did not contain valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    imagePrompt: string;
    caption: string;
    hashtags: string[];
  };

  return {
    imagePrompt: parsed.imagePrompt,
    caption: parsed.caption,
    hashtags: parsed.hashtags,
    model: MODEL,
    inputTokens,
    outputTokens,
  };
}

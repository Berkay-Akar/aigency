import { env } from '../../config/env';

const FAL_BASE_URL = 'https://fal.run';
const TIMEOUT_MS = 120_000;

export interface GenerateImageOptions {
  width?: number;
  height?: number;
  numImages?: number;
  negativePrompt?: string;
}

export interface GenerateVideoOptions {
  durationSeconds?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

export interface AiGenerationResult {
  url: string;
  status: 'completed';
  width?: number;
  height?: number;
  contentType: string;
}

async function falRequest<T>(
  model: string,
  input: Record<string, unknown>,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${FAL_BASE_URL}/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${env.FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`fal.ai error ${response.status}: ${body}`);
    }

    return response.json() as Promise<T>;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

interface FalImageResponse {
  images: Array<{ url: string; width: number; height: number; content_type: string }>;
}

interface FalVideoResponse {
  video: { url: string; content_type: string };
}

export async function generateImage(
  prompt: string,
  options: GenerateImageOptions = {},
): Promise<AiGenerationResult> {
  const result = await falRequest<FalImageResponse>(
    'fal-ai/flux/schnell',
    {
      prompt,
      image_size: {
        width: options.width ?? 1024,
        height: options.height ?? 1024,
      },
      num_images: options.numImages ?? 1,
      negative_prompt: options.negativePrompt,
    },
  );

  const image = result.images[0];

  if (!image) {
    throw new Error('fal.ai returned no images');
  }

  return {
    url: image.url,
    status: 'completed',
    width: image.width,
    height: image.height,
    contentType: image.content_type,
  };
}

export async function generateVideo(
  prompt: string,
  options: GenerateVideoOptions = {},
): Promise<AiGenerationResult> {
  const result = await falRequest<FalVideoResponse>(
    'fal-ai/kling-video/v1.6/standard/text-to-video',
    {
      prompt,
      duration: options.durationSeconds ?? 5,
      aspect_ratio: options.aspectRatio ?? '16:9',
    },
  );

  return {
    url: result.video.url,
    status: 'completed',
    contentType: result.video.content_type,
  };
}

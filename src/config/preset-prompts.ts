import type { GenerationMode } from './models';

export interface PresetPrompt {
  id: string;
  title: string;
  prompt: string;
}

export const PRESET_PROMPTS: Record<GenerationMode, PresetPrompt[]> = {
  'text-to-image': [
    {
      id: 'product-hero',
      title: 'Ürün hero görseli',
      prompt:
        'Minimal studio product shot, soft diffused lighting, clean white backdrop, subtle shadow, premium packaging, 85mm lens look, ultra sharp focus',
    },
    {
      id: 'social-quote',
      title: 'Sosyal medya illüstrasyonu',
      prompt:
        'Bold modern illustration for social feed, vibrant gradient background, friendly flat shapes, plenty of negative space for text overlay',
    },
    {
      id: 'lifestyle',
      title: 'Yaşam tarzı fotoğrafı',
      prompt:
        'Candid lifestyle photograph, golden hour natural light, shallow depth of field, authentic emotion, editorial magazine style',
    },
  ],
  'image-to-image': [
    {
      id: 'style-cinematic',
      title: 'Sinematik renk',
      prompt:
        'Apply cinematic color grading, teal and orange tones, film grain, increased contrast, moody atmosphere, keep composition and subject identity',
    },
    {
      id: 'background-swap',
      title: 'Arka plan değiştir',
      prompt:
        'Replace background with a modern minimalist interior, soft ambient lighting, keep the subject sharp and naturally integrated',
    },
    {
      id: 'sketch-to-render',
      title: 'Çizimden render',
      prompt:
        'Transform into photorealistic 3D render with realistic materials, soft global illumination, clean product visualization quality',
    },
  ],
  'image-to-video': [
    {
      id: 'gentle-motion',
      title: 'Hafif hareket',
      prompt:
        'Subtle natural motion, gentle camera push-in, soft ambient movement, cinematic slow pace, preserve subject details',
    },
    {
      id: 'nature-drama',
      title: 'Doğa dramı',
      prompt:
        'Dynamic environmental motion, wind and light shifts, waves or clouds moving, epic but realistic atmosphere',
    },
    {
      id: 'portrait-life',
      title: 'Portre canlandırma',
      prompt:
        'Natural micro-expressions, subtle breathing and blink, shallow depth of field, warm intimate lighting, documentary feel',
    },
  ],
};

export function listPresetPrompts(): typeof PRESET_PROMPTS {
  return PRESET_PROMPTS;
}

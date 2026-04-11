import type { GenerationMode } from './models';
export interface PresetPrompt {
    id: string;
    title: string;
    prompt: string;
}
export declare const PRESET_PROMPTS: Record<GenerationMode, PresetPrompt[]>;
export declare function listPresetPrompts(): typeof PRESET_PROMPTS;
//# sourceMappingURL=preset-prompts.d.ts.map
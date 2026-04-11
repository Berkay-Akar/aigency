import type { GenerationMode } from '../../config/models';
export declare function isOpenAiConfigured(): boolean;
/**
 * Optional GPT step when the user enables "promptumu güzelleştir".
 */
export declare function enhanceGenerationPrompt(rawPrompt: string, mode: GenerationMode): Promise<string>;
//# sourceMappingURL=prompt-builder.service.d.ts.map
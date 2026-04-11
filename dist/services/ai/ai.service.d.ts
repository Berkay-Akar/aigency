import type { GenerationMode } from '../../config/models';
export type AspectRatioPreset = 'portrait' | 'landscape' | 'square' | 'custom';
export type OutputFormat = 'png' | 'jpeg' | 'webp';
export interface AiGenerationResult {
    url: string;
    status: 'completed';
    width?: number;
    height?: number;
    contentType: string;
}
export interface RunAiGenerationParams {
    mode: GenerationMode;
    modelId: string;
    prompt: string;
    imageUrls: string[];
    aspectRatio: AspectRatioPreset;
    customWidth?: number;
    customHeight?: number;
    outputFormat: OutputFormat;
    duration: 5 | 10;
}
/**
 * Single entry used by the worker: routes to the correct fal model input shape.
 */
export declare function runAiGeneration(params: RunAiGenerationParams): Promise<AiGenerationResult>;
//# sourceMappingURL=ai.service.d.ts.map
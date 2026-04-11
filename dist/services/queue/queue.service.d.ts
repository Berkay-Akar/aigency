import { Queue } from 'bullmq';
export declare const aiQueue: Queue<any, any, string, any, any, string>;
export declare const publishQueue: Queue<any, any, string, any, any, string>;
export type AiGenerationMode = 'text-to-image' | 'image-to-image' | 'image-to-video';
export type AiAspectRatioPreset = 'portrait' | 'landscape' | 'square' | 'custom';
export type AiOutputFormat = 'png' | 'jpeg' | 'webp';
export interface AiJobPayload {
    jobId: string;
    workspaceId: string;
    userId: string;
    mode: AiGenerationMode;
    modelId: string;
    prompt: string;
    enhancePrompt: boolean;
    aspectRatio: AiAspectRatioPreset;
    customWidth?: number;
    customHeight?: number;
    outputFormat: AiOutputFormat;
    imageUrls: string[];
    duration: 5 | 10;
    platform?: 'instagram' | 'tiktok' | 'general';
    tone?: 'professional' | 'casual' | 'humorous' | 'inspirational';
}
export interface PublishJobPayload {
    scheduledPostId: string;
    workspaceId: string;
}
export interface OutboxCreateInput {
    queue: 'ai-jobs' | 'publish-jobs';
    name: 'generate' | 'publish';
    dedupeKey?: string;
    payload: Record<string, unknown>;
    runAt?: Date;
}
export declare function addAiJob(payload: AiJobPayload): Promise<string>;
export declare function addPublishJob(payload: PublishJobPayload, delayMs?: number): Promise<string>;
export declare function removePublishJobById(jobId: string): Promise<void>;
export declare function createOutboxJob(input: OutboxCreateInput): Promise<string>;
export declare function dispatchOutboxJob(id: string): Promise<void>;
export declare function dispatchPendingOutboxJobs(limit?: number): Promise<number>;
//# sourceMappingURL=queue.service.d.ts.map
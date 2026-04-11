"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishWorker = exports.aiWorker = void 0;
const bullmq_1 = require("bullmq");
const env_1 = require("../config/env");
require("./outbox.dispatcher");
require("./social-token-refresh.worker");
const ai_1 = require("../services/ai");
const prompt_builder_1 = require("../services/prompt-builder");
const storage_1 = require("../services/storage");
const social_1 = require("../services/social");
const prisma_1 = require("../lib/prisma");
const connection = {
    host: new URL(env_1.env.REDIS_URL).hostname,
    port: Number(new URL(env_1.env.REDIS_URL).port) || 6379,
    password: new URL(env_1.env.REDIS_URL).password || undefined,
};
const workerOptions = {
    connection,
    concurrency: 5,
};
exports.aiWorker = new bullmq_1.Worker('ai-jobs', async (job) => {
    const { jobId, workspaceId, userId, mode, modelId, prompt, enhancePrompt, aspectRatio, customWidth, customHeight, outputFormat, imageUrls, duration, } = job.data;
    job.log(`[ai-worker] Starting job ${jobId} mode=${mode} model=${modelId}`);
    let finalPrompt = prompt;
    if (enhancePrompt) {
        if (!(0, prompt_builder_1.isOpenAiConfigured)()) {
            throw new Error('enhancePrompt was true but OPENAI_API_KEY is not configured');
        }
        finalPrompt = await (0, prompt_builder_1.enhanceGenerationPrompt)(prompt, mode);
        job.log('[ai-worker] Prompt enhanced via GPT');
    }
    const assetType = mode === 'image-to-video' ? 'video' : 'image';
    const result = await (0, ai_1.runAiGeneration)({
        mode,
        modelId,
        prompt: finalPrompt,
        imageUrls,
        aspectRatio,
        customWidth,
        customHeight,
        outputFormat,
        duration: duration ?? 5,
    });
    job.log(`[ai-worker] Asset generated: ${result.url}`);
    const assetResponse = await fetch(result.url);
    const assetBuffer = Buffer.from(await assetResponse.arrayBuffer());
    const ext = result.contentType.split('/')[1] ?? 'bin';
    const r2Key = `workspaces/${workspaceId}/assets/${jobId}.${ext}`;
    const publicUrl = await (0, storage_1.uploadFile)(r2Key, assetBuffer, result.contentType);
    job.log(`[ai-worker] Uploaded to R2: ${publicUrl}`);
    const caption = prompt.length > 500 ? `${prompt.slice(0, 497)}...` : prompt;
    await prisma_1.prisma.asset.create({
        data: {
            id: jobId,
            workspaceId,
            jobId,
            type: assetType,
            url: publicUrl,
            r2Key,
            contentType: result.contentType,
            caption,
            hashtags: [],
        },
    });
    job.log(`[ai-worker] Asset saved to DB: ${jobId}`);
    return {
        jobId,
        workspaceId,
        userId,
        assetId: jobId,
        assetUrl: publicUrl,
        caption,
        hashtags: [],
        type: assetType,
    };
}, workerOptions);
exports.publishWorker = new bullmq_1.Worker('publish-jobs', async (job) => {
    const { scheduledPostId, workspaceId } = job.data;
    job.log(`[publish-worker] Starting publish for post ${scheduledPostId}`);
    const post = await prisma_1.prisma.scheduledPost.findFirst({
        where: { id: scheduledPostId, workspaceId },
    });
    if (!post) {
        throw new Error(`ScheduledPost ${scheduledPostId} not found`);
    }
    if (post.status === 'PUBLISHED') {
        job.log(`[publish-worker] Post ${scheduledPostId} already published, skipping`);
        return;
    }
    const asset = await prisma_1.prisma.asset.findUnique({
        where: { id: post.assetId },
    });
    if (!asset) {
        throw new Error(`Asset ${post.assetId} not found for post ${scheduledPostId}`);
    }
    const socialConnection = await prisma_1.prisma.socialConnection.findFirst({
        where: { workspaceId, platform: post.platform },
    });
    if (!socialConnection) {
        throw new Error(`No social connection for platform ${post.platform} in workspace ${workspaceId}`);
    }
    await (0, social_1.refreshConnectionIfNeeded)(socialConnection.id);
    const refreshedConnection = await prisma_1.prisma.socialConnection.findUnique({
        where: { id: socialConnection.id },
    });
    if (!refreshedConnection || refreshedConnection.status === 'INVALID') {
        throw new Error(`Social connection is invalid for platform ${post.platform}`);
    }
    const caption = `${post.caption}\n\n${post.hashtags.map((h) => `#${h}`).join(' ')}`;
    let result;
    if (post.platform === 'INSTAGRAM') {
        result = await social_1.InstagramService.publishPost({
            accessToken: refreshedConnection.accessToken,
            imageUrl: asset.url,
            caption,
        });
    }
    else {
        result = await social_1.TikTokService.publishPost({
            accessToken: refreshedConnection.accessToken,
            videoUrl: asset.url,
            caption,
        });
    }
    if (!result.success) {
        await prisma_1.prisma.scheduledPost.update({
            where: { id: scheduledPostId },
            data: {
                retryCount: { increment: 1 },
                errorMessage: result.error ?? 'Unknown publish error',
            },
        });
        throw new Error(result.error ?? 'Publish failed');
    }
    await prisma_1.prisma.scheduledPost.update({
        where: { id: scheduledPostId },
        data: { status: 'PUBLISHED', errorMessage: null },
    });
    job.log(`[publish-worker] Post ${scheduledPostId} published. Platform postId: ${result.postId}`);
}, workerOptions);
exports.aiWorker.on('completed', (job) => {
    console.log(`[ai-worker] Job ${job.id} completed`);
});
exports.aiWorker.on('failed', (job, err) => {
    console.error(`[ai-worker] Job ${job?.id} failed: ${err.message}`);
});
exports.publishWorker.on('completed', (job) => {
    console.log(`[publish-worker] Job ${job.id} completed`);
});
exports.publishWorker.on('failed', (job, err) => {
    console.error(`[publish-worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`);
});
//# sourceMappingURL=index.js.map
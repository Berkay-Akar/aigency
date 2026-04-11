import { Worker } from 'bullmq';
import { env } from '../config/env';
import './outbox.dispatcher';
import './social-token-refresh.worker';
import { runAiGeneration } from '../services/ai';
import {
  enhanceGenerationPrompt,
  isOpenAiConfigured,
} from '../services/prompt-builder';
import { uploadFile } from '../services/storage';
import {
  InstagramService,
  TikTokService,
  refreshConnectionIfNeeded,
} from '../services/social';
import { prisma } from '../lib/prisma';
import type { AiJobPayload, PublishJobPayload } from '../services/queue';

const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: Number(new URL(env.REDIS_URL).port) || 6379,
  password: new URL(env.REDIS_URL).password || undefined,
};

const workerOptions = {
  connection,
  concurrency: 5,
};

export const aiWorker = new Worker<AiJobPayload>(
  'ai-jobs',
  async (job) => {
    const {
      jobId,
      workspaceId,
      userId,
      mode,
      modelId,
      prompt,
      enhancePrompt,
      aspectRatio,
      customWidth,
      customHeight,
      outputFormat,
      imageUrls,
      duration,
    } = job.data;

    job.log(`[ai-worker] Starting job ${jobId} mode=${mode} model=${modelId}`);

    let finalPrompt = prompt;
    if (enhancePrompt) {
      if (!isOpenAiConfigured()) {
        throw new Error(
          'enhancePrompt was true but OPENAI_API_KEY is not configured',
        );
      }
      finalPrompt = await enhanceGenerationPrompt(prompt, mode);
      job.log('[ai-worker] Prompt enhanced via GPT');
    }

    const assetType = mode === 'image-to-video' ? 'video' : 'image';

    const result = await runAiGeneration({
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
    const publicUrl = await uploadFile(r2Key, assetBuffer, result.contentType);

    job.log(`[ai-worker] Uploaded to R2: ${publicUrl}`);

    const caption =
      prompt.length > 500 ? `${prompt.slice(0, 497)}...` : prompt;

    await prisma.asset.create({
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
      hashtags: [] as string[],
      type: assetType,
    };
  },
  workerOptions,
);

export const publishWorker = new Worker<PublishJobPayload>(
  'publish-jobs',
  async (job) => {
    const { scheduledPostId, workspaceId } = job.data;

    job.log(`[publish-worker] Starting publish for post ${scheduledPostId}`);

    const post = await prisma.scheduledPost.findFirst({
      where: { id: scheduledPostId, workspaceId },
    });

    if (!post) {
      throw new Error(`ScheduledPost ${scheduledPostId} not found`);
    }

    if (post.status === 'PUBLISHED') {
      job.log(`[publish-worker] Post ${scheduledPostId} already published, skipping`);
      return;
    }

    const asset = await prisma.asset.findUnique({
      where: { id: post.assetId },
    });

    if (!asset) {
      throw new Error(`Asset ${post.assetId} not found for post ${scheduledPostId}`);
    }

    const socialConnection = await prisma.socialConnection.findFirst({
      where: { workspaceId, platform: post.platform },
    });

    if (!socialConnection) {
      throw new Error(`No social connection for platform ${post.platform} in workspace ${workspaceId}`);
    }

    await refreshConnectionIfNeeded(socialConnection.id);
    const refreshedConnection = await prisma.socialConnection.findUnique({
      where: { id: socialConnection.id },
    });
    if (!refreshedConnection || refreshedConnection.status === 'INVALID') {
      throw new Error(`Social connection is invalid for platform ${post.platform}`);
    }

    const caption = `${post.caption}\n\n${post.hashtags.map((h) => `#${h}`).join(' ')}`;

    let result: { success: boolean; postId?: string; error?: string };

    if (post.platform === 'INSTAGRAM') {
      result = await InstagramService.publishPost({
        accessToken: refreshedConnection.accessToken,
        imageUrl: asset.url,
        caption,
      });
    } else {
      result = await TikTokService.publishPost({
        accessToken: refreshedConnection.accessToken,
        videoUrl: asset.url,
        caption,
      });
    }

    if (!result.success) {
      await prisma.scheduledPost.update({
        where: { id: scheduledPostId },
        data: {
          retryCount: { increment: 1 },
          errorMessage: result.error ?? 'Unknown publish error',
        },
      });
      throw new Error(result.error ?? 'Publish failed');
    }

    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: { status: 'PUBLISHED', errorMessage: null },
    });

    job.log(`[publish-worker] Post ${scheduledPostId} published. Platform postId: ${result.postId}`);
  },
  workerOptions,
);

aiWorker.on('completed', (job) => {
  console.log(`[ai-worker] Job ${job.id} completed`);
});

aiWorker.on('failed', (job, err) => {
  console.error(`[ai-worker] Job ${job?.id} failed: ${err.message}`);
});

publishWorker.on('completed', (job) => {
  console.log(`[publish-worker] Job ${job.id} completed`);
});

publishWorker.on('failed', (job, err) => {
  console.error(`[publish-worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`);
});

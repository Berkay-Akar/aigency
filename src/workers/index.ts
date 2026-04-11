import dns from 'node:dns';
import { Worker } from 'bullmq';

dns.setDefaultResultOrder('ipv4first');
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
import { fetchHttpsBuffer } from '../lib/ipv4-https';
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

    await prisma.aiGenerationJob.updateMany({
      where: { id: jobId, workspaceId },
      data: {
        status: 'PROCESSING',
        promptFinal: finalPrompt,
      },
    });

    const assetType = mode === 'image-to-video' ? 'video' : 'image';

    let result: Awaited<ReturnType<typeof runAiGeneration>>;
    try {
      result = await runAiGeneration({
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`[FAL] ${msg}`, { cause: err });
    }

    job.log(`[ai-worker] Asset generated: ${result.url}`);

    await prisma.aiGenerationJob.updateMany({
      where: { id: jobId, workspaceId },
      data: { falResultUrl: result.url },
    });

    let assetBuffer: Buffer;
    try {
      const fetched = await fetchHttpsBuffer(result.url);
      assetBuffer = fetched.buffer;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`[FETCH_RESULT_URL] ${result.url} — ${msg}`, {
        cause: err,
      });
    }

    const ext = result.contentType.split('/')[1] ?? 'bin';
    const objectKey = `workspaces/${workspaceId}/assets/${jobId}.${ext}`;
    let publicUrl: string;
    let storageKey: string;
    try {
      const uploaded = await uploadFile(objectKey, assetBuffer, result.contentType);
      publicUrl = uploaded.url;
      storageKey = uploaded.storageKey;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`[STORAGE_UPLOAD] ${msg}`, { cause: err });
    }

    job.log(`[ai-worker] Uploaded (${env.STORAGE_PROVIDER}): ${publicUrl}`);

    const caption =
      prompt.length > 500 ? `${prompt.slice(0, 497)}...` : prompt;

    await prisma.asset.create({
      data: {
        id: jobId,
        workspaceId,
        jobId,
        type: assetType,
        url: publicUrl,
        r2Key: storageKey,
        contentType: result.contentType,
        caption,
        hashtags: [],
      },
    });

    await prisma.aiGenerationJob.updateMany({
      where: { id: jobId, workspaceId },
      data: {
        status: 'COMPLETED',
        resultUrl: publicUrl,
        storageKey,
        storageProvider: env.STORAGE_PROVIDER,
        assetId: jobId,
        completedAt: new Date(),
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

aiWorker.on('failed', async (job, err) => {
  const jobId = job?.data?.jobId as string | undefined;
  console.error(`[ai-worker] Job ${job?.id} failed: ${err.message}`);
  if (!jobId || !job) return;

  const maxAttempts = job.opts.attempts ?? 3;
  const attemptsMade = job.attemptsMade ?? 0;
  const isFinal = attemptsMade >= maxAttempts;

  try {
    await prisma.aiGenerationJob.updateMany({
      where: { id: jobId },
      data: isFinal
        ? {
            status: 'FAILED',
            errorMessage: err.message.slice(0, 4000),
            completedAt: new Date(),
          }
        : {
            errorMessage: `retry ${attemptsMade}/${maxAttempts}: ${err.message.slice(0, 3500)}`,
          },
    });
  } catch (e) {
    console.error('[ai-worker] Failed to persist AiGenerationJob failure', e);
  }
});

publishWorker.on('completed', (job) => {
  console.log(`[publish-worker] Job ${job.id} completed`);
});

publishWorker.on('failed', (job, err) => {
  console.error(`[publish-worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`);
});

import { Worker } from 'bullmq';
import { env } from '../config/env';
import './outbox.dispatcher';
import './social-token-refresh.worker';
import { generateImage, generateVideo } from '../services/ai';
import { optimizePrompt } from '../services/prompt-builder';
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
    const { jobId, workspaceId, userId, type, prompt, options = {} } = job.data;

    job.log(`[ai-worker] Starting job ${jobId} type=${type}`);

    const platform = (options.platform as 'instagram' | 'tiktok' | 'general') ?? 'general';
    const tone = options.tone as 'professional' | 'casual' | 'humorous' | 'inspirational' | undefined;

    // Step 1: Optimize prompt with Claude
    const optimized = await optimizePrompt(prompt, { platform, tone });
    job.log(`[ai-worker] Prompt optimized. Tokens: ${optimized.inputTokens}+${optimized.outputTokens}`);

    // Step 2: Generate asset
    let resultUrl: string;
    let contentType: string;

    if (type === 'image') {
      const result = await generateImage(optimized.imagePrompt, {
        width: options.width as number | undefined,
        height: options.height as number | undefined,
      });
      resultUrl = result.url;
      contentType = result.contentType;
    } else {
      const result = await generateVideo(optimized.imagePrompt, {
        aspectRatio: (options.aspectRatio as '16:9' | '9:16' | '1:1') ?? '16:9',
      });
      resultUrl = result.url;
      contentType = result.contentType;
    }

    job.log(`[ai-worker] Asset generated: ${resultUrl}`);

    // Step 3: Download and re-upload to R2
    const assetResponse = await fetch(resultUrl);
    const assetBuffer = Buffer.from(await assetResponse.arrayBuffer());
    const ext = contentType.split('/')[1] ?? 'bin';
    const r2Key = `workspaces/${workspaceId}/assets/${jobId}.${ext}`;
    const publicUrl = await uploadFile(r2Key, assetBuffer, contentType);

    job.log(`[ai-worker] Uploaded to R2: ${publicUrl}`);

    // Step 4: Persist Asset record in DB
    await prisma.asset.create({
      data: {
        id: jobId,
        workspaceId,
        jobId,
        type,
        url: publicUrl,
        r2Key,
        contentType,
        caption: optimized.caption,
        hashtags: optimized.hashtags,
      },
    });

    job.log(`[ai-worker] Asset saved to DB: ${jobId}`);

    return {
      jobId,
      workspaceId,
      userId,
      assetId: jobId,
      assetUrl: publicUrl,
      caption: optimized.caption,
      hashtags: optimized.hashtags,
      type,
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

    // Resolve asset URL from DB
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

import { Queue } from 'bullmq';
import type { OutboxStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';

const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: Number(new URL(env.REDIS_URL).port) || 6379,
  password: new URL(env.REDIS_URL).password || undefined,
};

export const aiQueue = new Queue('ai-jobs', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export const publishQueue = new Queue('publish-jobs', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export type AiGenerationMode =
  | 'text-to-image'
  | 'image-to-image'
  | 'image-to-video';

export type AiAspectRatioPreset =
  | 'portrait'
  | 'landscape'
  | 'square'
  | 'custom';

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

export async function addAiJob(payload: AiJobPayload): Promise<string> {
  const job = await aiQueue.add('generate', payload, {
    jobId: payload.jobId,
  });
  return job.id ?? payload.jobId;
}

export async function addPublishJob(
  payload: PublishJobPayload,
  delayMs = 0,
): Promise<string> {
  const job = await publishQueue.add('publish', payload, {
    delay: delayMs,
    jobId: `publish-${payload.scheduledPostId}`,
  });
  return job.id ?? `publish-${payload.scheduledPostId}`;
}

export async function removePublishJobById(jobId: string): Promise<void> {
  const job = await publishQueue.getJob(jobId);
  if (job) {
    await job.remove();
  }
}

export async function createOutboxJob(input: OutboxCreateInput): Promise<string> {
  const record = await prisma.outboxJob.create({
    data: {
      queue: input.queue,
      name: input.name,
      dedupeKey: input.dedupeKey,
      payload: input.payload as Prisma.InputJsonValue,
      runAt: input.runAt ?? new Date(),
    },
  });
  return record.id;
}

async function markOutbox(
  id: string,
  status: OutboxStatus,
  lastError?: string,
): Promise<void> {
  await prisma.outboxJob.update({
    where: { id },
    data: {
      status,
      lastError,
      attempts: { increment: status === 'FAILED' ? 1 : 0 },
      enqueuedAt: status === 'ENQUEUED' ? new Date() : undefined,
    },
  });
}

export async function dispatchOutboxJob(id: string): Promise<void> {
  const job = await prisma.outboxJob.findUnique({
    where: { id },
  });
  if (!job || job.status !== 'PENDING') return;

  try {
    if (job.queue === 'ai-jobs' && job.name === 'generate') {
      await addAiJob(job.payload as unknown as AiJobPayload);
    } else if (job.queue === 'publish-jobs' && job.name === 'publish') {
      const payload = job.payload as unknown as PublishJobPayload;
      const delayMs = Math.max(0, job.runAt.getTime() - Date.now());
      await addPublishJob(payload, delayMs);
    } else {
      throw new Error(`Unsupported outbox queue/name: ${job.queue}/${job.name}`);
    }
    await markOutbox(job.id, 'ENQUEUED');
  } catch (err) {
    const error = err as Error;
    await markOutbox(job.id, 'FAILED', error.message);
    throw err;
  }
}

export async function dispatchPendingOutboxJobs(limit = 50): Promise<number> {
  const jobs = await prisma.outboxJob.findMany({
    where: { status: 'PENDING', runAt: { lte: new Date() } },
    orderBy: { runAt: 'asc' },
    take: limit,
  });
  for (const job of jobs) {
    await dispatchOutboxJob(job.id).catch(() => undefined);
  }
  return jobs.length;
}

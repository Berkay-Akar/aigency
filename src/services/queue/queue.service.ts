import { Queue } from 'bullmq';
import { env } from '../../config/env';

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

export interface AiJobPayload {
  jobId: string;
  workspaceId: string;
  userId: string;
  type: 'image' | 'video';
  prompt: string;
  options?: Record<string, unknown>;
}

export interface PublishJobPayload {
  scheduledPostId: string;
  workspaceId: string;
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

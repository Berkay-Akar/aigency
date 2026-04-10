import { prisma } from '../../lib/prisma';
import { addPublishJob, removePublishJobById } from '../queue';
import type { Platform, PostStatus } from '@prisma/client';

export interface SchedulePostInput {
  workspaceId: string;
  assetId: string;
  platform: Platform;
  caption: string;
  hashtags: string[];
  scheduledAt: Date;
}

export interface ScheduledPostRecord {
  id: string;
  workspaceId: string;
  assetId: string;
  platform: Platform;
  caption: string;
  hashtags: string[];
  scheduledAt: Date;
  status: PostStatus;
  publishJobId: string | null;
  retryCount: number;
  errorMessage: string | null;
  createdAt: Date;
}

export async function schedulePost(input: SchedulePostInput): Promise<ScheduledPostRecord> {
  const now = new Date();

  if (input.scheduledAt <= now) {
    throw Object.assign(new Error('scheduledAt must be in the future'), { statusCode: 400 });
  }

  const post = await prisma.scheduledPost.create({
    data: {
      workspaceId: input.workspaceId,
      assetId: input.assetId,
      platform: input.platform,
      caption: input.caption,
      hashtags: input.hashtags,
      scheduledAt: input.scheduledAt,
      status: 'SCHEDULED',
    },
  });

  const delayMs = input.scheduledAt.getTime() - now.getTime();

  const publishJobId = await addPublishJob(
    { scheduledPostId: post.id, workspaceId: input.workspaceId },
    delayMs,
  );

  return prisma.scheduledPost.update({
    where: { id: post.id },
    data: { publishJobId },
  });
}

export async function cancelPost(
  postId: string,
  workspaceId: string,
): Promise<ScheduledPostRecord> {
  const post = await prisma.scheduledPost.findFirst({
    where: { id: postId, workspaceId },
  });

  if (!post) {
    throw Object.assign(new Error('Post not found'), { statusCode: 404 });
  }

  if (post.status === 'PUBLISHED') {
    throw Object.assign(new Error('Cannot cancel an already published post'), { statusCode: 409 });
  }

  if (post.publishJobId) {
    await removePublishJobById(post.publishJobId);
  }

  return prisma.scheduledPost.update({
    where: { id: postId },
    data: { status: 'DRAFT', publishJobId: null },
  });
}

export async function getPostsByWorkspacePaged(
  workspaceId: string,
  options: {
    status?: PostStatus;
    from?: Date;
    to?: Date;
    page: number;
    limit: number;
  },
): Promise<{ posts: ScheduledPostRecord[]; total: number }> {
  const where = {
    workspaceId,
    ...(options.status ? { status: options.status } : {}),
    ...((options.from || options.to)
      ? {
          scheduledAt: {
            ...(options.from ? { gte: options.from } : {}),
            ...(options.to ? { lte: options.to } : {}),
          },
        }
      : {}),
  };

  const [posts, total] = await Promise.all([
    prisma.scheduledPost.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    }),
    prisma.scheduledPost.count({ where }),
  ]);

  return { posts, total };
}

export async function getPostsByWorkspace(
  workspaceId: string,
  status?: PostStatus,
): Promise<ScheduledPostRecord[]> {
  return prisma.scheduledPost.findMany({
    where: {
      workspaceId,
      ...(status ? { status } : {}),
    },
    orderBy: { scheduledAt: 'asc' },
  });
}

export async function getPostsByDateRange(
  workspaceId: string,
  from: Date,
  to: Date,
): Promise<ScheduledPostRecord[]> {
  return prisma.scheduledPost.findMany({
    where: {
      workspaceId,
      scheduledAt: { gte: from, lte: to },
    },
    orderBy: { scheduledAt: 'asc' },
  });
}

export async function getDuePosts(): Promise<ScheduledPostRecord[]> {
  return prisma.scheduledPost.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: new Date() },
    },
  });
}

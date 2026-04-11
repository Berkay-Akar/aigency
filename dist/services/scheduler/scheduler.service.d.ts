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
export declare function schedulePost(input: SchedulePostInput): Promise<ScheduledPostRecord>;
export declare function cancelPost(postId: string, workspaceId: string): Promise<ScheduledPostRecord>;
export declare function getPostsByWorkspacePaged(workspaceId: string, options: {
    status?: PostStatus;
    from?: Date;
    to?: Date;
    page: number;
    limit: number;
}): Promise<{
    posts: ScheduledPostRecord[];
    total: number;
}>;
export declare function getPostsByWorkspace(workspaceId: string, status?: PostStatus): Promise<ScheduledPostRecord[]>;
export declare function getPostsByDateRange(workspaceId: string, from: Date, to: Date): Promise<ScheduledPostRecord[]>;
export declare function getDuePosts(): Promise<ScheduledPostRecord[]>;
//# sourceMappingURL=scheduler.service.d.ts.map
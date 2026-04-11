"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulePost = schedulePost;
exports.cancelPost = cancelPost;
exports.getPostsByWorkspacePaged = getPostsByWorkspacePaged;
exports.getPostsByWorkspace = getPostsByWorkspace;
exports.getPostsByDateRange = getPostsByDateRange;
exports.getDuePosts = getDuePosts;
const prisma_1 = require("../../lib/prisma");
const queue_1 = require("../queue");
async function schedulePost(input) {
    const now = new Date();
    if (input.scheduledAt <= now) {
        throw Object.assign(new Error('scheduledAt must be in the future'), { statusCode: 400 });
    }
    const post = await prisma_1.prisma.scheduledPost.create({
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
    const publishJobId = await (0, queue_1.addPublishJob)({ scheduledPostId: post.id, workspaceId: input.workspaceId }, delayMs);
    return prisma_1.prisma.scheduledPost.update({
        where: { id: post.id },
        data: { publishJobId },
    });
}
async function cancelPost(postId, workspaceId) {
    const post = await prisma_1.prisma.scheduledPost.findFirst({
        where: { id: postId, workspaceId },
    });
    if (!post) {
        throw Object.assign(new Error('Post not found'), { statusCode: 404 });
    }
    if (post.status === 'PUBLISHED') {
        throw Object.assign(new Error('Cannot cancel an already published post'), { statusCode: 409 });
    }
    if (post.publishJobId) {
        await (0, queue_1.removePublishJobById)(post.publishJobId);
    }
    return prisma_1.prisma.scheduledPost.update({
        where: { id: postId },
        data: { status: 'DRAFT', publishJobId: null },
    });
}
async function getPostsByWorkspacePaged(workspaceId, options) {
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
        prisma_1.prisma.scheduledPost.findMany({
            where,
            orderBy: { scheduledAt: 'asc' },
            skip: (options.page - 1) * options.limit,
            take: options.limit,
        }),
        prisma_1.prisma.scheduledPost.count({ where }),
    ]);
    return { posts, total };
}
async function getPostsByWorkspace(workspaceId, status) {
    return prisma_1.prisma.scheduledPost.findMany({
        where: {
            workspaceId,
            ...(status ? { status } : {}),
        },
        orderBy: { scheduledAt: 'asc' },
    });
}
async function getPostsByDateRange(workspaceId, from, to) {
    return prisma_1.prisma.scheduledPost.findMany({
        where: {
            workspaceId,
            scheduledAt: { gte: from, lte: to },
        },
        orderBy: { scheduledAt: 'asc' },
    });
}
async function getDuePosts() {
    return prisma_1.prisma.scheduledPost.findMany({
        where: {
            status: 'SCHEDULED',
            scheduledAt: { lte: new Date() },
        },
    });
}
//# sourceMappingURL=scheduler.service.js.map
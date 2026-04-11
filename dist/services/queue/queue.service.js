"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishQueue = exports.aiQueue = void 0;
exports.addAiJob = addAiJob;
exports.addPublishJob = addPublishJob;
exports.removePublishJobById = removePublishJobById;
exports.createOutboxJob = createOutboxJob;
exports.dispatchOutboxJob = dispatchOutboxJob;
exports.dispatchPendingOutboxJobs = dispatchPendingOutboxJobs;
const bullmq_1 = require("bullmq");
const env_1 = require("../../config/env");
const prisma_1 = require("../../lib/prisma");
const connection = {
    host: new URL(env_1.env.REDIS_URL).hostname,
    port: Number(new URL(env_1.env.REDIS_URL).port) || 6379,
    password: new URL(env_1.env.REDIS_URL).password || undefined,
};
exports.aiQueue = new bullmq_1.Queue('ai-jobs', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
    },
});
exports.publishQueue = new bullmq_1.Queue('publish-jobs', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
    },
});
async function addAiJob(payload) {
    const job = await exports.aiQueue.add('generate', payload, {
        jobId: payload.jobId,
    });
    return job.id ?? payload.jobId;
}
async function addPublishJob(payload, delayMs = 0) {
    const job = await exports.publishQueue.add('publish', payload, {
        delay: delayMs,
        jobId: `publish-${payload.scheduledPostId}`,
    });
    return job.id ?? `publish-${payload.scheduledPostId}`;
}
async function removePublishJobById(jobId) {
    const job = await exports.publishQueue.getJob(jobId);
    if (job) {
        await job.remove();
    }
}
async function createOutboxJob(input) {
    const record = await prisma_1.prisma.outboxJob.create({
        data: {
            queue: input.queue,
            name: input.name,
            dedupeKey: input.dedupeKey,
            payload: input.payload,
            runAt: input.runAt ?? new Date(),
        },
    });
    return record.id;
}
async function markOutbox(id, status, lastError) {
    await prisma_1.prisma.outboxJob.update({
        where: { id },
        data: {
            status,
            lastError,
            attempts: { increment: status === 'FAILED' ? 1 : 0 },
            enqueuedAt: status === 'ENQUEUED' ? new Date() : undefined,
        },
    });
}
async function dispatchOutboxJob(id) {
    const job = await prisma_1.prisma.outboxJob.findUnique({
        where: { id },
    });
    if (!job || job.status !== 'PENDING')
        return;
    try {
        if (job.queue === 'ai-jobs' && job.name === 'generate') {
            await addAiJob(job.payload);
        }
        else if (job.queue === 'publish-jobs' && job.name === 'publish') {
            const payload = job.payload;
            const delayMs = Math.max(0, job.runAt.getTime() - Date.now());
            await addPublishJob(payload, delayMs);
        }
        else {
            throw new Error(`Unsupported outbox queue/name: ${job.queue}/${job.name}`);
        }
        await markOutbox(job.id, 'ENQUEUED');
    }
    catch (err) {
        const error = err;
        await markOutbox(job.id, 'FAILED', error.message);
        throw err;
    }
}
async function dispatchPendingOutboxJobs(limit = 50) {
    const jobs = await prisma_1.prisma.outboxJob.findMany({
        where: { status: 'PENDING', runAt: { lte: new Date() } },
        orderBy: { runAt: 'asc' },
        take: limit,
    });
    for (const job of jobs) {
        await dispatchOutboxJob(job.id).catch(() => undefined);
    }
    return jobs.length;
}
//# sourceMappingURL=queue.service.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRoutes = aiRoutes;
const crypto_1 = require("crypto");
const zod_1 = require("zod");
const auth_middleware_1 = require("../auth/auth.middleware");
const ai_schema_1 = require("./ai.schema");
const queue_1 = require("../../services/queue");
const prisma_1 = require("../../lib/prisma");
const response_1 = require("../../utils/response");
const models_1 = require("../../config/models");
const preset_prompts_1 = require("../../config/preset-prompts");
const prompt_builder_1 = require("../../services/prompt-builder");
const IMAGE_CREDIT_COST = 10;
const VIDEO_CREDIT_COST = 50;
const JobIdParamSchema = zod_1.z.object({
    jobId: zod_1.z.string().min(1),
});
async function aiRoutes(fastify) {
    fastify.get('/ai/preset-prompts', { preHandler: auth_middleware_1.authenticate }, async (_request, reply) => {
        return (0, response_1.sendSuccess)(reply, { presets: (0, preset_prompts_1.listPresetPrompts)() });
    });
    fastify.post('/ai/enhance-prompt', { preHandler: auth_middleware_1.authenticate }, async (request, reply) => {
        if (!(0, prompt_builder_1.isOpenAiConfigured)()) {
            return (0, response_1.sendError)(reply, 'OPENAI_API_KEY is not configured on the server', 503);
        }
        const parsed = ai_schema_1.EnhancePromptSchema.safeParse(request.body);
        if (!parsed.success) {
            return (0, response_1.sendError)(reply, parsed.error.errors[0]?.message ?? 'Invalid input', 400);
        }
        try {
            const enhancedPrompt = await (0, prompt_builder_1.enhanceGenerationPrompt)(parsed.data.prompt, parsed.data.mode);
            return (0, response_1.sendSuccess)(reply, { enhancedPrompt });
        }
        catch (err) {
            const error = err;
            fastify.log.error({ err }, 'enhance-prompt failed');
            return (0, response_1.sendError)(reply, error.message, 502);
        }
    });
    fastify.post('/ai/generate', { preHandler: auth_middleware_1.authenticate }, async (request, reply) => {
        const parsed = ai_schema_1.GenerateSchema.safeParse(request.body);
        if (!parsed.success) {
            return (0, response_1.sendError)(reply, parsed.error.errors[0]?.message ?? 'Invalid input', 400);
        }
        const { sub: userId, workspaceId } = (0, auth_middleware_1.getUser)(request);
        const data = parsed.data;
        if (data.enhancePrompt && !(0, prompt_builder_1.isOpenAiConfigured)()) {
            return (0, response_1.sendError)(reply, 'OPENAI_API_KEY is not configured; disable enhancePrompt or configure OpenAI', 503);
        }
        const cost = data.mode === 'image-to-video' ? VIDEO_CREDIT_COST : IMAGE_CREDIT_COST;
        const jobId = (0, crypto_1.randomUUID)();
        const modelId = (0, models_1.resolveModelId)(data.mode, data.modelTier);
        try {
            await prisma_1.prisma.$transaction(async (tx) => {
                const workspace = await tx.workspace.findUnique({
                    where: { id: workspaceId },
                    select: { credits: true },
                });
                if (!workspace) {
                    throw Object.assign(new Error('Workspace not found'), {
                        statusCode: 404,
                    });
                }
                if (workspace.credits < cost) {
                    throw Object.assign(new Error('Insufficient credits'), {
                        statusCode: 402,
                    });
                }
                await tx.workspace.update({
                    where: { id: workspaceId },
                    data: { credits: { decrement: cost } },
                });
                await tx.outboxJob.create({
                    data: {
                        queue: 'ai-jobs',
                        name: 'generate',
                        dedupeKey: `ai-generate:${jobId}`,
                        payload: {
                            jobId,
                            workspaceId,
                            userId,
                            mode: data.mode,
                            modelId,
                            prompt: data.prompt,
                            enhancePrompt: data.enhancePrompt,
                            aspectRatio: data.aspectRatio,
                            customWidth: data.customWidth,
                            customHeight: data.customHeight,
                            outputFormat: data.outputFormat,
                            imageUrls: data.imageUrls,
                            duration: data.duration,
                            platform: data.platform,
                            tone: data.tone,
                        },
                    },
                });
            });
        }
        catch (err) {
            const error = err;
            return (0, response_1.sendError)(reply, error.message, error.statusCode ?? 402);
        }
        try {
            await (0, queue_1.dispatchPendingOutboxJobs)(20);
            return (0, response_1.sendSuccess)(reply, { jobId, status: 'queued', creditsCost: cost, modelId }, 202);
        }
        catch (err) {
            const error = err;
            fastify.log.error({ err, jobId }, 'Failed to enqueue AI job');
            return (0, response_1.sendError)(reply, error.message, 500);
        }
    });
    fastify.get('/jobs/:jobId', { preHandler: auth_middleware_1.authenticate }, async (request, reply) => {
        const { workspaceId } = (0, auth_middleware_1.getUser)(request);
        const paramsParsed = JobIdParamSchema.safeParse(request.params);
        if (!paramsParsed.success) {
            return (0, response_1.sendError)(reply, 'Invalid jobId', 400);
        }
        const { jobId } = paramsParsed.data;
        const job = await queue_1.aiQueue.getJob(jobId);
        if (!job) {
            const outbox = await prisma_1.prisma.outboxJob.findUnique({
                where: { dedupeKey: `ai-generate:${jobId}` },
            });
            if (!outbox) {
                return (0, response_1.sendError)(reply, 'Job not found', 404);
            }
            const payload = outbox.payload;
            if (payload.workspaceId !== workspaceId) {
                return (0, response_1.sendError)(reply, 'Job not found', 404);
            }
            return (0, response_1.sendSuccess)(reply, {
                id: jobId,
                status: outbox.status === 'FAILED' ? 'failed' : 'queued',
                result: undefined,
                failedReason: outbox.lastError ?? undefined,
            });
        }
        const payload = job.data;
        if (payload.workspaceId !== workspaceId) {
            return (0, response_1.sendError)(reply, 'Job not found', 404);
        }
        const state = await job.getState();
        const normalized = state === 'waiting' || state === 'delayed' ? 'queued'
            : state === 'active' ? 'processing'
                : state === 'completed' ? 'completed'
                    : 'failed';
        const result = normalized === 'completed' && job.returnvalue
            ? {
                url: job.returnvalue.assetUrl,
                assetId: job.returnvalue.assetId,
            }
            : undefined;
        const failedReason = normalized === 'failed' ? job.failedReason : undefined;
        return (0, response_1.sendSuccess)(reply, {
            id: jobId,
            status: normalized,
            result,
            failedReason,
        });
    });
}
//# sourceMappingURL=ai.routes.js.map
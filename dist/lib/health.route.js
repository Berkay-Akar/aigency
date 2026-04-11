"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = healthRoutes;
const prisma_1 = require("./prisma");
const queue_1 = require("../services/queue");
async function probeDb() {
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        return 'connected';
    }
    catch {
        return 'error';
    }
}
async function probeQueue() {
    try {
        const client = await queue_1.aiQueue.client;
        await client.ping();
        return 'working';
    }
    catch {
        return 'error';
    }
}
async function healthRoutes(fastify) {
    fastify.get('/health', async (_request, reply) => {
        const [db, queue] = await Promise.all([
            probeDb(),
            probeQueue(),
        ]);
        const healthy = db === 'connected' && queue === 'working';
        const status = healthy ? 'ok' : 'degraded';
        reply.status(healthy ? 200 : 503).send({
            success: healthy,
            data: {
                status,
                db,
                queue,
                timestamp: new Date().toISOString(),
            },
        });
    });
}
//# sourceMappingURL=health.route.js.map
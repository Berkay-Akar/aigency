"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBalance = getBalance;
exports.deductCredits = deductCredits;
exports.addCredits = addCredits;
exports.refundCredits = refundCredits;
const prisma_1 = require("../../lib/prisma");
async function getBalance(workspaceId) {
    const workspace = await prisma_1.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { credits: true },
    });
    if (!workspace) {
        throw Object.assign(new Error('Workspace not found'), { statusCode: 404 });
    }
    return workspace.credits;
}
async function deductCredits(workspaceId, amount) {
    if (amount <= 0)
        throw Object.assign(new Error('Amount must be positive'), { statusCode: 400 });
    const workspace = await prisma_1.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { credits: true },
    });
    if (!workspace) {
        throw Object.assign(new Error('Workspace not found'), { statusCode: 404 });
    }
    if (workspace.credits < amount) {
        throw Object.assign(new Error('Insufficient credits'), { statusCode: 402 });
    }
    const updated = await prisma_1.prisma.workspace.update({
        where: { id: workspaceId },
        data: { credits: { decrement: amount } },
        select: { credits: true },
    });
    return updated.credits;
}
async function addCredits(workspaceId, amount) {
    if (amount <= 0)
        throw Object.assign(new Error('Amount must be positive'), { statusCode: 400 });
    const updated = await prisma_1.prisma.workspace.update({
        where: { id: workspaceId },
        data: { credits: { increment: amount } },
        select: { credits: true },
    });
    return updated.credits;
}
async function refundCredits(workspaceId, amount) {
    return addCredits(workspaceId, amount);
}
//# sourceMappingURL=billing.service.js.map
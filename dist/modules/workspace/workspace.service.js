"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkspace = getWorkspace;
exports.updateWorkspace = updateWorkspace;
exports.getMembers = getMembers;
exports.inviteMember = inviteMember;
exports.acceptInvite = acceptInvite;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../../lib/prisma");
const auth_service_1 = require("../auth/auth.service");
const env_1 = require("../../config/env");
const resend_service_1 = require("../../services/email/resend.service");
const SAFE_USER_SELECT = {
    id: true,
    email: true,
    name: true,
    role: true,
    workspaceId: true,
    createdAt: true,
};
async function getWorkspace(workspaceId) {
    const workspace = await prisma_1.prisma.workspace.findUnique({
        where: { id: workspaceId },
    });
    if (!workspace) {
        throw Object.assign(new Error('Workspace not found'), { statusCode: 404 });
    }
    return workspace;
}
async function updateWorkspace(workspaceId, input) {
    return prisma_1.prisma.workspace.update({
        where: { id: workspaceId },
        data: { name: input.name },
    });
}
async function getMembers(workspaceId) {
    return prisma_1.prisma.user.findMany({
        where: { workspaceId },
        select: SAFE_USER_SELECT,
        orderBy: { createdAt: 'asc' },
    });
}
async function inviteMember(workspaceId, invitedById, input) {
    const workspace = await prisma_1.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, name: true },
    });
    if (!workspace) {
        throw Object.assign(new Error('Workspace not found'), { statusCode: 404 });
    }
    const userExists = await prisma_1.prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true },
    });
    if (userExists) {
        throw Object.assign(new Error('Email already in use'), { statusCode: 409 });
    }
    const rawToken = crypto_1.default.randomBytes(32).toString('hex');
    const tokenHash = crypto_1.default.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const invite = await prisma_1.prisma.workspaceInvite.create({
        data: {
            email: input.email,
            role: input.role,
            workspaceId,
            invitedById,
            tokenHash,
            expiresAt,
        },
    });
    const inviteLink = `${env_1.env.APP_URL}/accept-invite?token=${rawToken}`;
    await (0, resend_service_1.sendWorkspaceInviteEmail)({
        to: input.email,
        workspaceName: workspace.name,
        inviteLink,
        role: input.role,
    });
    return { inviteId: invite.id, expiresAt: invite.expiresAt };
}
async function acceptInvite(input) {
    const tokenHash = crypto_1.default.createHash('sha256').update(input.token).digest('hex');
    const invite = await prisma_1.prisma.workspaceInvite.findUnique({
        where: { tokenHash },
    });
    if (!invite) {
        throw Object.assign(new Error('Invalid invite token'), { statusCode: 400 });
    }
    if (invite.consumedAt) {
        throw Object.assign(new Error('Invite already used'), { statusCode: 409 });
    }
    if (invite.expiresAt < new Date()) {
        throw Object.assign(new Error('Invite expired'), { statusCode: 410 });
    }
    const existing = await prisma_1.prisma.user.findUnique({
        where: { email: invite.email },
        select: { id: true },
    });
    if (existing) {
        throw Object.assign(new Error('Email already in use'), { statusCode: 409 });
    }
    const passwordHash = await (0, auth_service_1.hashPassword)(input.password);
    return prisma_1.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                email: invite.email,
                name: input.name,
                passwordHash,
                role: invite.role,
                workspaceId: invite.workspaceId,
            },
            select: SAFE_USER_SELECT,
        });
        await tx.workspaceInvite.update({
            where: { id: invite.id },
            data: {
                consumedAt: new Date(),
                acceptedById: user.id,
            },
        });
        return user;
    });
}
//# sourceMappingURL=workspace.service.js.map
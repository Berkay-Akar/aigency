"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.buildJwtPayload = buildJwtPayload;
exports.sanitizeUser = sanitizeUser;
exports.generateRefreshToken = generateRefreshToken;
exports.rotateRefreshToken = rotateRefreshToken;
exports.register = register;
exports.login = login;
exports.authenticateWithGoogle = authenticateWithGoogle;
exports.unlinkGoogleFromUser = unlinkGoogleFromUser;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
const prisma_1 = require("../../lib/prisma");
const SALT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_DAYS = 30;
function generateSlug(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
function makeSlugUnique(base) {
    return `${base}-${Date.now().toString(36)}`;
}
function refreshTokenExpiresAt() {
    const d = new Date();
    d.setDate(d.getDate() + REFRESH_TOKEN_TTL_DAYS);
    return d;
}
async function hashPassword(password) {
    return bcryptjs_1.default.hash(password, SALT_ROUNDS);
}
async function verifyPassword(plain, hash) {
    return bcryptjs_1.default.compare(plain, hash);
}
function buildJwtPayload(user) {
    return {
        sub: user.id,
        email: user.email,
        workspaceId: user.workspaceId,
        role: user.role,
    };
}
function sanitizeUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        workspaceId: user.workspaceId,
    };
}
async function generateRefreshToken(userId) {
    const token = (0, crypto_1.randomUUID)();
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: {
            refreshToken: token,
            refreshTokenExpiresAt: refreshTokenExpiresAt(),
        },
    });
    return token;
}
async function rotateRefreshToken(oldToken) {
    const user = await prisma_1.prisma.user.findFirst({
        where: { refreshToken: oldToken },
    });
    if (!user) {
        throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
    }
    if (!user.refreshTokenExpiresAt || user.refreshTokenExpiresAt < new Date()) {
        // Invalidate the expired token
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: null, refreshTokenExpiresAt: null },
        });
        throw Object.assign(new Error('Refresh token expired'), { statusCode: 401 });
    }
    const newRefreshToken = await generateRefreshToken(user.id);
    const authUser = sanitizeUser({ ...user, role: user.role.toString() });
    return { user: authUser, payload: buildJwtPayload(authUser), refreshToken: newRefreshToken };
}
async function register(input) {
    const existing = await prisma_1.prisma.user.findUnique({
        where: { email: input.email },
    });
    if (existing) {
        throw Object.assign(new Error('Email already in use'), { statusCode: 409 });
    }
    const passwordHash = await hashPassword(input.password);
    const baseSlug = generateSlug(input.workspaceName);
    const slug = makeSlugUnique(baseSlug);
    const workspace = await prisma_1.prisma.workspace.create({
        data: {
            name: input.workspaceName,
            slug,
            ownerId: 'pending',
        },
    });
    const user = await prisma_1.prisma.user.create({
        data: {
            email: input.email,
            name: input.name,
            passwordHash,
            role: 'OWNER',
            workspaceId: workspace.id,
        },
    });
    await prisma_1.prisma.workspace.update({
        where: { id: workspace.id },
        data: { ownerId: user.id },
    });
    const refreshToken = await generateRefreshToken(user.id);
    const authUser = sanitizeUser({ ...user, role: user.role.toString() });
    return { user: authUser, payload: buildJwtPayload(authUser), refreshToken };
}
async function login(input) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { email: input.email },
    });
    if (!user) {
        throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }
    if (!user.passwordHash) {
        throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
        throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }
    const refreshToken = await generateRefreshToken(user.id);
    const authUser = sanitizeUser({ ...user, role: user.role.toString() });
    return { user: authUser, payload: buildJwtPayload(authUser), refreshToken };
}
async function authenticateWithGoogle(input) {
    async function logGoogleEvent(eventType, userId) {
        await prisma_1.prisma.authAuditLog.create({
            data: {
                eventType,
                userId,
                email: input.email,
                provider: 'google',
                providerSubject: input.googleId,
            },
        });
    }
    const byGoogle = await prisma_1.prisma.user.findUnique({
        where: { googleId: input.googleId },
    });
    if (byGoogle) {
        const refreshToken = await generateRefreshToken(byGoogle.id);
        const authUser = sanitizeUser({
            ...byGoogle,
            role: byGoogle.role.toString(),
        });
        return { user: authUser, payload: buildJwtPayload(authUser), refreshToken };
    }
    const byEmail = await prisma_1.prisma.user.findUnique({
        where: { email: input.email },
    });
    if (byEmail) {
        if (byEmail.googleId && byEmail.googleId !== input.googleId) {
            throw Object.assign(new Error('This email is linked to another Google account'), {
                statusCode: 409,
            });
        }
        const updated = await prisma_1.prisma.user.update({
            where: { id: byEmail.id },
            data: { googleId: input.googleId },
        });
        await logGoogleEvent('GOOGLE_LINKED', updated.id);
        const refreshToken = await generateRefreshToken(updated.id);
        const authUser = sanitizeUser({
            ...updated,
            role: updated.role.toString(),
        });
        return { user: authUser, payload: buildJwtPayload(authUser), refreshToken };
    }
    const baseSlug = generateSlug(input.name);
    const slug = makeSlugUnique(baseSlug);
    const workspace = await prisma_1.prisma.workspace.create({
        data: {
            name: `${input.name}'s workspace`,
            slug,
            ownerId: 'pending',
        },
    });
    const user = await prisma_1.prisma.user.create({
        data: {
            email: input.email,
            name: input.name,
            passwordHash: null,
            googleId: input.googleId,
            role: 'OWNER',
            workspaceId: workspace.id,
        },
    });
    await prisma_1.prisma.workspace.update({
        where: { id: workspace.id },
        data: { ownerId: user.id },
    });
    const refreshToken = await generateRefreshToken(user.id);
    await logGoogleEvent('GOOGLE_LINKED', user.id);
    const authUser = sanitizeUser({ ...user, role: user.role.toString() });
    return { user: authUser, payload: buildJwtPayload(authUser), refreshToken };
}
async function unlinkGoogleFromUser(userId) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user) {
        throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }
    if (!user.googleId) {
        throw Object.assign(new Error('Google is not linked'), { statusCode: 400 });
    }
    if (!user.passwordHash) {
        throw Object.assign(new Error('Set a password before unlinking Google'), { statusCode: 400 });
    }
    const updated = await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { googleId: null },
    });
    await prisma_1.prisma.authAuditLog.create({
        data: {
            eventType: 'GOOGLE_UNLINKED',
            userId: updated.id,
            email: updated.email,
            provider: 'google',
        },
    });
    return sanitizeUser({ ...updated, role: updated.role.toString() });
}
//# sourceMappingURL=auth.service.js.map
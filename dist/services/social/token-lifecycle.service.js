"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshConnectionIfNeeded = refreshConnectionIfNeeded;
exports.refreshExpiringSocialConnections = refreshExpiringSocialConnections;
const prisma_1 = require("../../lib/prisma");
const env_1 = require("../../config/env");
const crypto_1 = require("./crypto");
const InstagramService = __importStar(require("./instagram.service"));
const TikTokService = __importStar(require("./tiktok.service"));
const REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000;
async function refreshConnectionIfNeeded(connectionId) {
    const connection = await prisma_1.prisma.socialConnection.findUnique({
        where: { id: connectionId },
    });
    if (!connection)
        return;
    if (connection.status === 'INVALID')
        return;
    if (!connection.expiresAt)
        return;
    const shouldRefresh = connection.expiresAt.getTime() - Date.now() <= REFRESH_THRESHOLD_MS;
    if (!shouldRefresh)
        return;
    try {
        if (connection.platform === 'INSTAGRAM') {
            const accessToken = await InstagramService.refreshToken(connection.accessToken);
            await prisma_1.prisma.socialConnection.update({
                where: { id: connection.id },
                data: {
                    accessToken: (0, crypto_1.encryptToken)(accessToken),
                    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                    status: 'ACTIVE',
                    invalidAt: null,
                    lastCheckedAt: new Date(),
                },
            });
            return;
        }
        if (!connection.refreshToken) {
            throw new Error('Missing TikTok refresh token');
        }
        const refreshed = await TikTokService.refreshToken(connection.refreshToken, env_1.env.TIKTOK_CLIENT_KEY, env_1.env.TIKTOK_CLIENT_SECRET);
        await prisma_1.prisma.socialConnection.update({
            where: { id: connection.id },
            data: {
                accessToken: (0, crypto_1.encryptToken)(refreshed.accessToken),
                refreshToken: (0, crypto_1.encryptToken)(refreshed.refreshToken),
                expiresAt: refreshed.expiresAt,
                status: 'ACTIVE',
                invalidAt: null,
                lastCheckedAt: new Date(),
            },
        });
    }
    catch (err) {
        const error = err;
        await prisma_1.prisma.socialConnection.update({
            where: { id: connection.id },
            data: {
                status: 'INVALID',
                invalidAt: new Date(),
                lastCheckedAt: new Date(),
            },
        });
        throw error;
    }
}
async function refreshExpiringSocialConnections(limit = 50) {
    const threshold = new Date(Date.now() + REFRESH_THRESHOLD_MS);
    const connections = await prisma_1.prisma.socialConnection.findMany({
        where: {
            status: 'ACTIVE',
            expiresAt: { lte: threshold },
        },
        take: limit,
        orderBy: { expiresAt: 'asc' },
    });
    for (const connection of connections) {
        await refreshConnectionIfNeeded(connection.id).catch(() => undefined);
    }
    return connections.length;
}
//# sourceMappingURL=token-lifecycle.service.js.map
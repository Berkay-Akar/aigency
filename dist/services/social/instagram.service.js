"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishPost = publishPost;
exports.validateToken = validateToken;
exports.refreshToken = refreshToken;
const env_1 = require("../../config/env");
const crypto_1 = require("./crypto");
const GRAPH_BASE = 'https://graph.instagram.com/v19.0';
async function publishPost(input) {
    const token = (0, crypto_1.decryptToken)(input.accessToken);
    try {
        // Step 1: Create media container
        const containerRes = await fetch(`${GRAPH_BASE}/me/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_url: input.imageUrl,
                caption: input.caption,
                access_token: token,
            }),
        });
        if (!containerRes.ok) {
            const err = await containerRes.text();
            return { success: false, error: `Container creation failed: ${err}` };
        }
        const container = await containerRes.json();
        // Step 2: Publish container
        const publishRes = await fetch(`${GRAPH_BASE}/me/media_publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                creation_id: container.id,
                access_token: token,
            }),
        });
        if (!publishRes.ok) {
            const err = await publishRes.text();
            return { success: false, error: `Publish failed: ${err}` };
        }
        const published = await publishRes.json();
        return { success: true, postId: published.id };
    }
    catch (err) {
        const error = err;
        return { success: false, error: error.message };
    }
}
async function validateToken(encryptedToken) {
    const token = (0, crypto_1.decryptToken)(encryptedToken);
    try {
        const res = await fetch(`https://graph.facebook.com/debug_token?input_token=${token}&access_token=${env_1.env.INSTAGRAM_CLIENT_ID}|${env_1.env.INSTAGRAM_CLIENT_SECRET}`);
        if (!res.ok)
            return { valid: false };
        const data = await res.json();
        return {
            valid: data.data.is_valid,
            expiresAt: data.data.expires_at
                ? new Date(data.data.expires_at * 1000)
                : undefined,
        };
    }
    catch {
        return { valid: false };
    }
}
async function refreshToken(encryptedToken) {
    const token = (0, crypto_1.decryptToken)(encryptedToken);
    const res = await fetch(`${GRAPH_BASE}/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`);
    if (!res.ok) {
        throw new Error('Instagram token refresh failed');
    }
    const data = await res.json();
    return data.access_token;
}
//# sourceMappingURL=instagram.service.js.map
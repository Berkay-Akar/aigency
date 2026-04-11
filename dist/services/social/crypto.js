"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptToken = encryptToken;
exports.decryptToken = decryptToken;
const crypto_1 = require("crypto");
const env_1 = require("../../config/env");
const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(env_1.env.ENCRYPTION_KEY, 'hex');
function encryptToken(plaintext) {
    const iv = (0, crypto_1.randomBytes)(12);
    const cipher = (0, crypto_1.createCipheriv)(ALGORITHM, KEY, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}
function decryptToken(ciphertext) {
    const [ivB64, authTagB64, dataB64] = ciphertext.split(':');
    if (!ivB64 || !authTagB64 || !dataB64) {
        throw new Error('Invalid ciphertext format');
    }
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = (0, crypto_1.createDecipheriv)(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(data) + decipher.final('utf8');
}
//# sourceMappingURL=crypto.js.map
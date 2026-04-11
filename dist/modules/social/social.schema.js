"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokCallbackSchema = exports.InstagramCallbackSchema = exports.PlatformParamSchema = void 0;
const zod_1 = require("zod");
exports.PlatformParamSchema = zod_1.z.object({
    platform: zod_1.z.enum(['instagram', 'tiktok']),
});
exports.InstagramCallbackSchema = zod_1.z.object({
    code: zod_1.z.string().min(1),
    state: zod_1.z.string().min(1),
    error: zod_1.z.string().optional(),
    error_description: zod_1.z.string().optional(),
});
exports.TikTokCallbackSchema = zod_1.z.object({
    code: zod_1.z.string().min(1),
    state: zod_1.z.string().min(1),
    scopes: zod_1.z.string().optional(),
    error: zod_1.z.string().optional(),
    error_description: zod_1.z.string().optional(),
});
//# sourceMappingURL=social.schema.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostsQuerySchema = exports.PostIdParamSchema = exports.CalendarQuerySchema = exports.SchedulePostSchema = void 0;
const zod_1 = require("zod");
exports.SchedulePostSchema = zod_1.z.object({
    assetId: zod_1.z.string().min(1),
    platform: zod_1.z.enum(['INSTAGRAM', 'TIKTOK']),
    caption: zod_1.z.string().min(1).max(2200),
    hashtags: zod_1.z.array(zod_1.z.string().min(1).max(50)).max(30).default([]),
    scheduledAt: zod_1.z.string().datetime(),
});
exports.CalendarQuerySchema = zod_1.z.object({
    from: zod_1.z.string().datetime(),
    to: zod_1.z.string().datetime(),
});
exports.PostIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
});
exports.PostsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    status: zod_1.z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED']).optional(),
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
});
//# sourceMappingURL=scheduler.schema.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcceptInviteSchema = exports.InviteMemberSchema = exports.UpdateWorkspaceSchema = void 0;
const zod_1 = require("zod");
exports.UpdateWorkspaceSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
});
exports.InviteMemberSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    role: zod_1.z.enum(['MEMBER', 'OWNER']).default('MEMBER'),
});
exports.AcceptInviteSchema = zod_1.z.object({
    token: zod_1.z.string().min(20),
    name: zod_1.z.string().min(2).max(100),
    password: zod_1.z.string().min(8).max(128),
});
//# sourceMappingURL=workspace.schema.js.map
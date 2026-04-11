import { z } from 'zod';
export declare const UpdateWorkspaceSchema: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export declare const InviteMemberSchema: z.ZodObject<{
    email: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["MEMBER", "OWNER"]>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    role: "OWNER" | "MEMBER";
}, {
    email: string;
    role?: "OWNER" | "MEMBER" | undefined;
}>;
export declare const AcceptInviteSchema: z.ZodObject<{
    token: z.ZodString;
    name: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    password: string;
    token: string;
}, {
    name: string;
    password: string;
    token: string;
}>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
export type AcceptInviteInput = z.infer<typeof AcceptInviteSchema>;
export interface SafeUser {
    id: string;
    email: string;
    name: string;
    role: string;
    workspaceId: string;
    createdAt: Date;
}
export interface WorkspaceInfo {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    createdAt: Date;
}
//# sourceMappingURL=workspace.schema.d.ts.map
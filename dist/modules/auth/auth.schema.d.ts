import { z } from 'zod';
export declare const RegisterSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    workspaceName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    password: string;
    workspaceName: string;
}, {
    name: string;
    email: string;
    password: string;
    workspaceName: string;
}>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export interface JwtPayload {
    sub: string;
    email: string;
    workspaceId: string;
    role: string;
}
export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: string;
    workspaceId: string;
}
//# sourceMappingURL=auth.schema.d.ts.map
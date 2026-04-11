import { z } from 'zod';
export declare const PlatformParamSchema: z.ZodObject<{
    platform: z.ZodEnum<["instagram", "tiktok"]>;
}, "strip", z.ZodTypeAny, {
    platform: "instagram" | "tiktok";
}, {
    platform: "instagram" | "tiktok";
}>;
export declare const InstagramCallbackSchema: z.ZodObject<{
    code: z.ZodString;
    state: z.ZodString;
    error: z.ZodOptional<z.ZodString>;
    error_description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code: string;
    state: string;
    error?: string | undefined;
    error_description?: string | undefined;
}, {
    code: string;
    state: string;
    error?: string | undefined;
    error_description?: string | undefined;
}>;
export declare const TikTokCallbackSchema: z.ZodObject<{
    code: z.ZodString;
    state: z.ZodString;
    scopes: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
    error_description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code: string;
    state: string;
    error?: string | undefined;
    error_description?: string | undefined;
    scopes?: string | undefined;
}, {
    code: string;
    state: string;
    error?: string | undefined;
    error_description?: string | undefined;
    scopes?: string | undefined;
}>;
export type PlatformParam = z.infer<typeof PlatformParamSchema>;
//# sourceMappingURL=social.schema.d.ts.map
import { z } from 'zod';
export declare const SchedulePostSchema: z.ZodObject<{
    assetId: z.ZodString;
    platform: z.ZodEnum<["INSTAGRAM", "TIKTOK"]>;
    caption: z.ZodString;
    hashtags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    scheduledAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    platform: "INSTAGRAM" | "TIKTOK";
    assetId: string;
    caption: string;
    hashtags: string[];
    scheduledAt: string;
}, {
    platform: "INSTAGRAM" | "TIKTOK";
    assetId: string;
    caption: string;
    scheduledAt: string;
    hashtags?: string[] | undefined;
}>;
export declare const CalendarQuerySchema: z.ZodObject<{
    from: z.ZodString;
    to: z.ZodString;
}, "strip", z.ZodTypeAny, {
    from: string;
    to: string;
}, {
    from: string;
    to: string;
}>;
export declare const PostIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const PostsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["DRAFT", "SCHEDULED", "PUBLISHED", "FAILED"]>>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    status?: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED" | undefined;
    from?: string | undefined;
    to?: string | undefined;
}, {
    status?: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED" | undefined;
    from?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    to?: string | undefined;
}>;
export type SchedulePostInput = z.infer<typeof SchedulePostSchema>;
export type CalendarQuery = z.infer<typeof CalendarQuerySchema>;
export type PostsQuery = z.infer<typeof PostsQuerySchema>;
//# sourceMappingURL=scheduler.schema.d.ts.map
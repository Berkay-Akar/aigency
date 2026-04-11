import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(3001),

    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),

    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default("7d"),

    // 32-byte hex string for AES-256 token encryption
    ENCRYPTION_KEY: z.string().length(64),

    FAL_API_KEY: z.string().min(1),

    /** Used for optional "promptumu güzelleştir" (GPT prompt enhancement) */
    OPENAI_API_KEY: z.string().default(""),

    /** Legacy; optional if unused */
    ANTHROPIC_API_KEY: z.string().default(""),

    /** `cloudinary` (aktif) veya `r2` (R2 kodunu yorumdan çıkardıktan sonra) */
    STORAGE_PROVIDER: z.enum(["cloudinary", "r2"]).default("cloudinary"),

    CLOUDINARY_CLOUD_NAME: z.string().default(""),
    CLOUDINARY_API_KEY: z.string().default(""),
    CLOUDINARY_API_SECRET: z.string().default(""),

    R2_ACCOUNT_ID: z.string().default(""),
    R2_ACCESS_KEY_ID: z.string().default(""),
    R2_SECRET_ACCESS_KEY: z.string().default(""),
    R2_BUCKET_NAME: z.string().default(""),
    R2_PUBLIC_URL: z.string().default(""),

    IYZICO_API_KEY: z.string().min(1),
    IYZICO_SECRET_KEY: z.string().min(1),
    IYZICO_BASE_URL: z.string().url(),
    IYZICO_WEBHOOK_HMAC_SECRET: z.string().default(""),
    IYZICO_WEBHOOK_SHARED_SECRET: z.string().default(""),

    INSTAGRAM_CLIENT_ID: z.string().min(1),
    INSTAGRAM_CLIENT_SECRET: z.string().min(1),
    INSTAGRAM_REDIRECT_URI: z.string().url(),

    TIKTOK_CLIENT_KEY: z.string().min(1),
    TIKTOK_CLIENT_SECRET: z.string().min(1),
    TIKTOK_REDIRECT_URI: z.string().url(),

    /** Leave empty until Google Cloud OAuth credentials exist */
    GOOGLE_CLIENT_ID: z.string().default(""),
    GOOGLE_CLIENT_SECRET: z.string().default(""),
    GOOGLE_REDIRECT_URI: z.string().default(""),

    RESEND_API_KEY: z.string().default(""),
    RESEND_FROM_EMAIL: z.string().default(""),

    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),

    APP_URL: z.string().url(),
  })
  .superRefine((data, ctx) => {
    if (data.STORAGE_PROVIDER === "cloudinary") {
      if (!data.CLOUDINARY_CLOUD_NAME) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CLOUDINARY_CLOUD_NAME gerekli (STORAGE_PROVIDER=cloudinary)",
          path: ["CLOUDINARY_CLOUD_NAME"],
        });
      }
      if (!data.CLOUDINARY_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CLOUDINARY_API_KEY gerekli",
          path: ["CLOUDINARY_API_KEY"],
        });
      }
      if (!data.CLOUDINARY_API_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CLOUDINARY_API_SECRET gerekli",
          path: ["CLOUDINARY_API_SECRET"],
        });
      }
    } else {
      if (!data.R2_ACCOUNT_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "R2_ACCOUNT_ID gerekli (STORAGE_PROVIDER=r2)",
          path: ["R2_ACCOUNT_ID"],
        });
      }
      if (!data.R2_ACCESS_KEY_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "R2_ACCESS_KEY_ID gerekli",
          path: ["R2_ACCESS_KEY_ID"],
        });
      }
      if (!data.R2_SECRET_ACCESS_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "R2_SECRET_ACCESS_KEY gerekli",
          path: ["R2_SECRET_ACCESS_KEY"],
        });
      }
      if (!data.R2_BUCKET_NAME) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "R2_BUCKET_NAME gerekli",
          path: ["R2_BUCKET_NAME"],
        });
      }
      const pub = z.string().url().safeParse(data.R2_PUBLIC_URL);
      if (!pub.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "R2_PUBLIC_URL geçerli bir URL olmalı",
          path: ["R2_PUBLIC_URL"],
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  console.error(parsed.error.errors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

export function isGoogleOAuthConfigured(): boolean {
  return (
    env.GOOGLE_CLIENT_ID.length > 0 &&
    env.GOOGLE_CLIENT_SECRET.length > 0 &&
    env.GOOGLE_REDIRECT_URI.length > 0
  );
}

export function isResendConfigured(): boolean {
  return env.RESEND_API_KEY.length > 0 && env.RESEND_FROM_EMAIL.length > 0;
}

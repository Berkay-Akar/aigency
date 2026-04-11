"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.isGoogleOAuthConfigured = isGoogleOAuthConfigured;
exports.isResendConfigured = isResendConfigured;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum(["development", "test", "production"])
        .default("development"),
    PORT: zod_1.z.coerce.number().int().positive().default(3001),
    DATABASE_URL: zod_1.z.string().url(),
    REDIS_URL: zod_1.z.string().url(),
    JWT_SECRET: zod_1.z.string().min(32),
    JWT_EXPIRES_IN: zod_1.z.string().default("7d"),
    // 32-byte hex string for AES-256 token encryption
    ENCRYPTION_KEY: zod_1.z.string().length(64),
    FAL_API_KEY: zod_1.z.string().min(1),
    /** Used for optional "promptumu güzelleştir" (GPT prompt enhancement) */
    OPENAI_API_KEY: zod_1.z.string().default(""),
    /** Legacy; optional if unused */
    ANTHROPIC_API_KEY: zod_1.z.string().default(""),
    R2_ACCOUNT_ID: zod_1.z.string().min(1),
    R2_ACCESS_KEY_ID: zod_1.z.string().min(1),
    R2_SECRET_ACCESS_KEY: zod_1.z.string().min(1),
    R2_BUCKET_NAME: zod_1.z.string().min(1),
    R2_PUBLIC_URL: zod_1.z.string().url(),
    IYZICO_API_KEY: zod_1.z.string().min(1),
    IYZICO_SECRET_KEY: zod_1.z.string().min(1),
    IYZICO_BASE_URL: zod_1.z.string().url(),
    IYZICO_WEBHOOK_HMAC_SECRET: zod_1.z.string().default(""),
    IYZICO_WEBHOOK_SHARED_SECRET: zod_1.z.string().default(""),
    INSTAGRAM_CLIENT_ID: zod_1.z.string().min(1),
    INSTAGRAM_CLIENT_SECRET: zod_1.z.string().min(1),
    INSTAGRAM_REDIRECT_URI: zod_1.z.string().url(),
    TIKTOK_CLIENT_KEY: zod_1.z.string().min(1),
    TIKTOK_CLIENT_SECRET: zod_1.z.string().min(1),
    TIKTOK_REDIRECT_URI: zod_1.z.string().url(),
    /** Leave empty until Google Cloud OAuth credentials exist */
    GOOGLE_CLIENT_ID: zod_1.z.string().default(""),
    GOOGLE_CLIENT_SECRET: zod_1.z.string().default(""),
    GOOGLE_REDIRECT_URI: zod_1.z.string().default(""),
    RESEND_API_KEY: zod_1.z.string().default(""),
    RESEND_FROM_EMAIL: zod_1.z.string().default(""),
    RATE_LIMIT_MAX: zod_1.z.coerce.number().int().positive().default(200),
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().int().positive().default(60000),
    APP_URL: zod_1.z.string().url(),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.env = parsed.data;
function isGoogleOAuthConfigured() {
    return (exports.env.GOOGLE_CLIENT_ID.length > 0 &&
        exports.env.GOOGLE_CLIENT_SECRET.length > 0 &&
        exports.env.GOOGLE_REDIRECT_URI.length > 0);
}
function isResendConfigured() {
    return exports.env.RESEND_API_KEY.length > 0 && exports.env.RESEND_FROM_EMAIL.length > 0;
}
//# sourceMappingURL=env.js.map
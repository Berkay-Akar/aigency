"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOpenAiConfigured = isOpenAiConfigured;
exports.enhanceGenerationPrompt = enhanceGenerationPrompt;
const openai_1 = __importDefault(require("openai"));
const env_1 = require("../../config/env");
const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 1024;
const TIMEOUT_MS = 30_000;
function isOpenAiConfigured() {
    return env_1.env.OPENAI_API_KEY.length > 0;
}
function modeDescription(mode) {
    switch (mode) {
        case 'text-to-image':
            return 'text-to-image generation (describe the final still image)';
        case 'image-to-image':
            return 'image editing / image-to-image (describe the desired change while preserving subject identity)';
        case 'image-to-video':
            return 'image-to-video (describe motion, camera, and atmosphere; the start frame is provided separately)';
    }
}
function buildSystemPrompt(mode) {
    const task = modeDescription(mode);
    return `You are an expert prompt engineer for ${task}.
Improve the user's prompt: add concrete visual detail, lighting, composition, and style where helpful. Keep the user's intent and primary language.
Do not add explanations, markdown, or quotation marks.
Output ONLY the final prompt as a single plain-text paragraph.`;
}
/**
 * Optional GPT step when the user enables "promptumu güzelleştir".
 */
async function enhanceGenerationPrompt(rawPrompt, mode) {
    if (!isOpenAiConfigured()) {
        throw new Error('OPENAI_API_KEY is not configured');
    }
    const client = new openai_1.default({ apiKey: env_1.env.OPENAI_API_KEY });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const completion = await client.chat.completions.create({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            temperature: 0.65,
            messages: [
                { role: 'system', content: buildSystemPrompt(mode) },
                { role: 'user', content: rawPrompt },
            ],
        }, { signal: controller.signal });
        clearTimeout(timeout);
        const text = completion.choices[0]?.message?.content?.trim();
        if (!text) {
            throw new Error('OpenAI returned an empty prompt');
        }
        return text;
    }
    catch (err) {
        clearTimeout(timeout);
        throw err;
    }
}
//# sourceMappingURL=prompt-builder.service.js.map
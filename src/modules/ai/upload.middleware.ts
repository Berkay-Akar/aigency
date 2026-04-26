import { randomUUID } from "crypto";
import type { FastifyRequest, FastifyReply } from "fastify";
import { getUser } from "../auth/auth.middleware";
import { uploadAiInputFile } from "../../services/storage";
import { sendError } from "../../utils/response";

export interface FieldConfig {
  /** Multipart field name (e.g. "productImage") OR JSON body key for data-URI detection */
  name: string;
  /** Key to write the Cloudinary URL into request.body (e.g. "productImageUrl") */
  bodyKey: string;
  /** Collect multiple files into an array — for model-photo */
  multiple?: boolean;
}

const ALLOWED_MIMETYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/** Parse a `data:<mime>;base64,<data>` URI into a Buffer + mimetype. */
function parseDataUri(
  value: string,
): { buffer: Buffer; mimetype: string } | null {
  const match = /^data:([a-z]+\/[a-z]+);base64,(.+)$/.exec(value);
  if (!match) return null;
  return {
    mimetype: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

/** Upload a base64 data-URI string to Cloudinary and return the public URL. */
async function uploadDataUri(
  workspaceId: string,
  value: string,
  reply: FastifyReply,
): Promise<string | null> {
  const parsed = parseDataUri(value);
  if (!parsed) {
    sendError(reply, "Invalid data URI", 400);
    return null;
  }
  if (!ALLOWED_MIMETYPES.includes(parsed.mimetype)) {
    sendError(reply, "Only JPEG, PNG and WebP images are allowed", 415);
    return null;
  }
  if (parsed.buffer.length > MAX_FILE_SIZE) {
    sendError(reply, "File too large — maximum is 10 MB per image", 413);
    return null;
  }
  const uploaded = await uploadAiInputFile(
    workspaceId,
    randomUUID(),
    parsed.buffer,
    parsed.mimetype,
  );
  return uploaded.url;
}

/**
 * Factory that creates a Fastify preHandler which intercepts incoming images and
 * uploads them to Cloudinary `inputs/{workspaceId}/` before the route handler runs.
 *
 * Handles three cases transparently:
 *  1. `multipart/form-data`   — file parts are streamed, uploaded, URL injected into body
 *  2. `application/json` with `data:` base64 URIs — decoded, uploaded, replaced with URL
 *  3. `application/json` with plain HTTPS URLs    — passed through unchanged
 *
 * Must be placed AFTER `authenticate` in the preHandler array.
 */
export function createUploadMiddleware(fields: FieldConfig[]) {
  const fieldByName = new Map(fields.map((f) => [f.name, f]));
  const fieldByBodyKey = new Map(fields.map((f) => [f.bodyKey, f]));

  return async function uploadMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const contentType = request.headers["content-type"] ?? "";
    const { workspaceId } = getUser(request);

    /* ------------------------------------------------------------------ */
    /* Case 1: multipart/form-data                                         */
    /* ------------------------------------------------------------------ */
    if (contentType.includes("multipart/form-data")) {
      const body: Record<string, unknown> = {};
      const multipleAccumulators = new Map<string, string[]>();
      for (const f of fields) {
        if (f.multiple) multipleAccumulators.set(f.bodyKey, []);
      }

      try {
        for await (const part of request.parts({
          limits: { fileSize: MAX_FILE_SIZE },
        })) {
          if (part.type === "file") {
            const config = fieldByName.get(part.fieldname);
            if (!config) {
              await part.toBuffer(); // drain to avoid hanging
              continue;
            }
            if (!ALLOWED_MIMETYPES.includes(part.mimetype)) {
              return sendError(
                reply,
                "Only JPEG, PNG and WebP images are allowed",
                415,
              );
            }
            const buffer = await part.toBuffer();
            if ((part.file as unknown as { truncated?: boolean }).truncated) {
              return sendError(
                reply,
                "File too large — maximum is 10 MB per image",
                413,
              );
            }
            const { url } = await uploadAiInputFile(
              workspaceId,
              randomUUID(),
              buffer,
              part.mimetype,
            );
            if (config.multiple) {
              multipleAccumulators.get(config.bodyKey)!.push(url);
            } else {
              body[config.bodyKey] = url;
            }
          } else {
            // text field — pass through as-is, Zod will coerce types
            body[part.fieldname] = part.value;
          }
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to process upload";
        return sendError(reply, message, 400);
      }

      for (const [key, urls] of multipleAccumulators) {
        body[key] = urls;
      }
      request.body = body;
      return;
    }

    /* ------------------------------------------------------------------ */
    /* Case 2: JSON body — replace any data: URI with a Cloudinary URL    */
    /* ------------------------------------------------------------------ */
    const body = request.body as Record<string, unknown>;
    if (!body || typeof body !== "object") return;

    for (const [bodyKey, config] of fieldByBodyKey) {
      const value = body[bodyKey];

      if (config.multiple && Array.isArray(value)) {
        const urls: string[] = [];
        for (const item of value) {
          if (typeof item === "string" && item.startsWith("data:")) {
            const url = await uploadDataUri(workspaceId, item, reply);
            if (url === null) return; // error already sent
            urls.push(url);
          } else if (typeof item === "string") {
            urls.push(item);
          }
        }
        body[bodyKey] = urls;
      } else if (typeof value === "string" && value.startsWith("data:")) {
        const url = await uploadDataUri(workspaceId, value, reply);
        if (url === null) return; // error already sent
        body[bodyKey] = url;
      }
      // plain HTTPS URL or missing field — leave untouched
    }
  };
}

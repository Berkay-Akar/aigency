import type { FastifyInstance } from "fastify";
import { authenticate, getUser } from "../auth/auth.middleware";
import { BrandKitUpdateSchema } from "./brand-kit.schema";
import { getBrandKit, upsertBrandKit } from "./brand-kit.service";
import { sendSuccess, sendError } from "../../utils/response";
import { uploadBrandAssetFile } from "../../services/storage";

const ALLOWED_LOGO_MIMETYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];
const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5 MB

export async function brandKitRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    "/brand-kit",
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { workspaceId } = getUser(request);
        const kit = await getBrandKit(workspaceId);
        return sendSuccess(reply, { brandKit: kit ?? null });
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        return sendError(reply, error.message, error.statusCode ?? 500);
      }
    },
  );

  /**
   * POST /brand-kit/logo
   * Accepts multipart/form-data (field: "logo") or application/json { "logo": "data:<mime>;base64,..." }
   * Uploads to Cloudinary brand-assets/{workspaceId}/ and saves the URL in BrandKit.logoUrl.
   */
  fastify.post(
    "/brand-kit/logo",
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = getUser(request);
      const contentType = request.headers["content-type"] ?? "";

      let buffer: Buffer;
      let mimetype: string;

      if (contentType.includes("multipart/form-data")) {
        let found = false;
        for await (const part of request.parts({
          limits: { fileSize: MAX_LOGO_SIZE },
        })) {
          if (part.type === "file" && part.fieldname === "logo") {
            if (!ALLOWED_LOGO_MIMETYPES.includes(part.mimetype)) {
              return sendError(
                reply,
                "Only JPEG, PNG, WebP and SVG images are allowed",
                415,
              );
            }
            buffer = await part.toBuffer();
            if ((part.file as unknown as { truncated?: boolean }).truncated) {
              return sendError(reply, "File too large — maximum is 5 MB", 413);
            }
            mimetype = part.mimetype;
            found = true;
            break;
          } else if (part.type === "file") {
            await part.toBuffer(); // drain
          }
        }
        if (!found) {
          return sendError(reply, "Missing 'logo' file field", 400);
        }
      } else {
        // JSON body: { "logo": "data:<mime>;base64,..." }
        const body = request.body as Record<string, unknown>;
        const raw = body?.logo;
        if (typeof raw !== "string" || !raw.startsWith("data:")) {
          return sendError(
            reply,
            "Expected JSON body with 'logo' as a data URI (data:<mime>;base64,...)",
            400,
          );
        }
        const match = raw.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
          return sendError(reply, "Invalid data URI format", 400);
        }
        mimetype = match[1];
        if (!ALLOWED_LOGO_MIMETYPES.includes(mimetype)) {
          return sendError(
            reply,
            "Only JPEG, PNG, WebP and SVG images are allowed",
            415,
          );
        }
        const decoded = Buffer.from(match[2], "base64");
        if (decoded.byteLength > MAX_LOGO_SIZE) {
          return sendError(reply, "File too large — maximum is 5 MB", 413);
        }
        buffer = decoded;
      }

      try {
        const { url } = await uploadBrandAssetFile(
          workspaceId,
          "logo",
          buffer!,
          mimetype!,
        );
        const kit = await upsertBrandKit(workspaceId, { logoUrl: url });
        return sendSuccess(reply, { logoUrl: url, brandKit: kit });
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        return sendError(reply, error.message, error.statusCode ?? 500);
      }
    },
  );

  fastify.patch(
    "/brand-kit",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = BrandKitUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(
          reply,
          parsed.error.errors[0]?.message ?? "Invalid input",
          400,
        );
      }
      try {
        const { workspaceId } = getUser(request);
        const kit = await upsertBrandKit(workspaceId, parsed.data);
        return sendSuccess(reply, { brandKit: kit });
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        return sendError(reply, error.message, error.statusCode ?? 500);
      }
    },
  );
}

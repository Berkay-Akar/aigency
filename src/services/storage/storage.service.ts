import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env";

/* -------------------------------------------------------------------------- */
/* Cloudflare R2 (S3) — geçici olarak devre dışı; tekrar açmak için          */
/* STORAGE_PROVIDER=r2 yap ve aşağıdaki bloğu yorumdan çıkar.                 */
/* -------------------------------------------------------------------------- */
// import {
//   S3Client,
//   PutObjectCommand,
//   DeleteObjectCommand,
// } from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
// import { awsRequestHandlerIpv4 } from '../../lib/ipv4-https';
//
// const s3 = new S3Client({
//   region: 'auto',
//   endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
//   credentials: {
//     accessKeyId: env.R2_ACCESS_KEY_ID,
//     secretAccessKey: env.R2_SECRET_ACCESS_KEY,
//   },
//   forcePathStyle: true,
//   requestHandler: awsRequestHandlerIpv4,
// });
//
// async function uploadFileR2(
//   key: string,
//   body: Buffer,
//   contentType: string,
// ): Promise<string> {
//   await s3.send(
//     new PutObjectCommand({
//       Bucket: env.R2_BUCKET_NAME,
//       Key: key,
//       Body: body,
//       ContentType: contentType,
//     }),
//   );
//   return getPublicUrlR2(key);
// }
//
// function getPublicUrlR2(key: string): string {
//   return `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
// }
//
// export async function getPresignedUploadUrlR2(
//   key: string,
//   contentType: string,
//   expiresIn = 300,
// ): Promise<string> {
//   return getSignedUrl(
//     s3,
//     new PutObjectCommand({
//       Bucket: env.R2_BUCKET_NAME,
//       Key: key,
//       ContentType: contentType,
//     }),
//     { expiresIn },
//   );
// }
//
// export async function deleteFileR2(key: string): Promise<void> {
//   await s3.send(
//     new DeleteObjectCommand({
//       Bucket: env.R2_BUCKET_NAME,
//       Key: key,
//     }),
//   );
// }

if (env.STORAGE_PROVIDER === "cloudinary") {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function parseStorageKey(key: string): { folder: string; publicId: string } {
  const lastSlash = key.lastIndexOf("/");
  const fileName = lastSlash >= 0 ? key.slice(lastSlash + 1) : key;
  const folder = lastSlash >= 0 ? key.slice(0, lastSlash) : "";
  const dot = fileName.lastIndexOf(".");
  const base = dot >= 0 ? fileName.slice(0, dot) : fileName;
  return { folder, publicId: base };
}

export interface UploadResult {
  url: string;
  /** Cloudinary `public_id` veya R2 object key (Asset.r2Key). */
  storageKey: string;
}

/** Cloudinary key for user-uploaded input images: `uploads/{userId}/{uuid}.{ext}` */
export function userUploadKey(
  userId: string,
  uuid: string,
  ext: string,
): string {
  return `uploads/${userId}/${uuid}.${ext}`;
}

/** Cloudinary key for AI generation outputs: `outputs/{userId}/{jobId}.{ext}` */
export function userOutputKey(
  userId: string,
  jobId: string,
  ext: string,
): string {
  return `outputs/${userId}/${jobId}.${ext}`;
}

/** Cloudinary key for AI-workflow input images: `inputs/{userId}/{uuid}.{ext}` */
export function userAiInputKey(
  userId: string,
  uuid: string,
  ext: string,
): string {
  return `inputs/${userId}/${uuid}.${ext}`;
}

/**
 * Upload a file received from an AI route's multipart upload
 * to `inputs/{userId}/`. Used by the upload middleware.
 */
export async function uploadAiInputFile(
  userId: string,
  fileUuid: string,
  body: Buffer,
  contentType: string,
): Promise<UploadResult> {
  const ext = contentType.split("/")[1]?.split(";")[0] ?? "bin";
  const key = userAiInputKey(userId, fileUuid, ext);
  return uploadFile(key, body, contentType);
}

/**
 * Upload a user-provided input file to `uploads/{userId}/`.
 * Used by the `POST /assets/upload` endpoint.
 */
export async function uploadUserInputFile(
  userId: string,
  fileUuid: string,
  body: Buffer,
  contentType: string,
): Promise<UploadResult> {
  const ext = contentType.split("/")[1]?.split(";")[0] ?? "bin";
  const key = userUploadKey(userId, fileUuid, ext);
  return uploadFile(key, body, contentType);
}

/**
 * Upload buffer; returns public URL + storage key for DB.
 * `key` format: `outputs/{userId}/{jobId}.{ext}` for AI outputs.
 */
export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<UploadResult> {
  if (env.STORAGE_PROVIDER === "r2") {
    throw new Error(
      "STORAGE_PROVIDER=r2 seçili fakat R2 kodu şu an yorumda; storage.service.ts içinde R2 bloğunu aç.",
    );
  }

  const { folder, publicId } = parseStorageKey(key);
  const resourceType = contentType.startsWith("video/") ? "video" : "image";

  const result = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: folder || undefined,
          public_id: publicId,
          resource_type: resourceType,
          overwrite: true,
        },
        (err, res) => {
          if (err) reject(err);
          else if (!res?.secure_url)
            reject(new Error("Cloudinary upload returned no secure_url"));
          else
            resolve({ secure_url: res.secure_url, public_id: res.public_id });
        },
      );
      stream.end(body);
    },
  );

  return { url: result.secure_url, storageKey: result.public_id };
}

/** Cloudinary için: tam `public_id` (klasör + id); R2 için: object key. */
export function getPublicUrl(key: string): string {
  if (env.STORAGE_PROVIDER === "cloudinary") {
    return cloudinary.url(key, { secure: true, resource_type: "auto" });
  }
  throw new Error(
    "getPublicUrl: R2 modu yorumda — Cloudinary kullanın veya R2 bloğunu açın.",
  );
}

export async function getPresignedUploadUrl(
  _key: string,
  _contentType: string,
  _expiresIn = 300,
): Promise<string> {
  throw new Error(
    "getPresignedUploadUrl: Cloudinary modunda desteklenmiyor (R2’ye dönünce storage.service.ts içindeki R2 fonksiyonunu kullan).",
  );
}

export async function deleteFile(publicIdOrKey: string): Promise<void> {
  if (env.STORAGE_PROVIDER === "cloudinary") {
    await cloudinary.uploader.destroy(publicIdOrKey, {
      resource_type: "auto",
      invalidate: true,
    });
    return;
  }
  throw new Error("deleteFile: R2 modu yorumda.");
}

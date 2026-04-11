"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = uploadFile;
exports.getPublicUrl = getPublicUrl;
exports.getPresignedUploadUrl = getPresignedUploadUrl;
exports.deleteFile = deleteFile;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const env_1 = require("../../config/env");
const s3 = new client_s3_1.S3Client({
    region: 'auto',
    endpoint: `https://${env_1.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: env_1.env.R2_ACCESS_KEY_ID,
        secretAccessKey: env_1.env.R2_SECRET_ACCESS_KEY,
    },
});
async function uploadFile(key, body, contentType) {
    await s3.send(new client_s3_1.PutObjectCommand({
        Bucket: env_1.env.R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
    }));
    return getPublicUrl(key);
}
function getPublicUrl(key) {
    return `${env_1.env.R2_PUBLIC_URL}/${key}`;
}
async function getPresignedUploadUrl(key, contentType, expiresIn = 300) {
    return (0, s3_request_presigner_1.getSignedUrl)(s3, new client_s3_1.PutObjectCommand({
        Bucket: env_1.env.R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    }), { expiresIn });
}
async function deleteFile(key) {
    await s3.send(new client_s3_1.DeleteObjectCommand({
        Bucket: env_1.env.R2_BUCKET_NAME,
        Key: key,
    }));
}
//# sourceMappingURL=storage.service.js.map
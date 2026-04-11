export declare function uploadFile(key: string, body: Buffer, contentType: string): Promise<string>;
export declare function getPublicUrl(key: string): string;
export declare function getPresignedUploadUrl(key: string, contentType: string, expiresIn?: number): Promise<string>;
export declare function deleteFile(key: string): Promise<void>;
//# sourceMappingURL=storage.service.d.ts.map
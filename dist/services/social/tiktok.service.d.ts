export interface TikTokPublishInput {
    accessToken: string;
    videoUrl: string;
    caption: string;
}
export interface PublishResult {
    success: boolean;
    postId?: string;
    error?: string;
}
export interface TokenValidation {
    valid: boolean;
    expiresAt?: Date;
}
export declare function publishPost(input: TikTokPublishInput): Promise<PublishResult>;
export declare function validateToken(encryptedToken: string): Promise<TokenValidation>;
export declare function refreshToken(encryptedRefreshToken: string, clientKey: string, clientSecret: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
}>;
//# sourceMappingURL=tiktok.service.d.ts.map
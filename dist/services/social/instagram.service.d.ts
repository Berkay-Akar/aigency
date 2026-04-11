export interface PublishPostInput {
    accessToken: string;
    imageUrl: string;
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
export declare function publishPost(input: PublishPostInput): Promise<PublishResult>;
export declare function validateToken(encryptedToken: string): Promise<TokenValidation>;
export declare function refreshToken(encryptedToken: string): Promise<string>;
//# sourceMappingURL=instagram.service.d.ts.map
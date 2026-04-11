export interface GoogleTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
    scope?: string;
    id_token?: string;
}
export interface GoogleUserInfo {
    sub: string;
    email: string;
    email_verified?: boolean;
    name: string;
    picture?: string;
}
export declare function exchangeGoogleAuthorizationCode(code: string): Promise<GoogleTokenResponse>;
export declare function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo>;
export declare function buildGoogleAuthorizationUrl(state: string): string;
//# sourceMappingURL=google.oauth.service.d.ts.map
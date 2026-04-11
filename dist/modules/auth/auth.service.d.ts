import type { RegisterInput, LoginInput, AuthUser, JwtPayload } from './auth.schema';
export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(plain: string, hash: string): Promise<boolean>;
export declare function buildJwtPayload(user: AuthUser): JwtPayload;
export declare function sanitizeUser(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    workspaceId: string;
}): AuthUser;
export declare function generateRefreshToken(userId: string): Promise<string>;
export declare function rotateRefreshToken(oldToken: string): Promise<{
    user: AuthUser;
    payload: JwtPayload;
    refreshToken: string;
}>;
export declare function register(input: RegisterInput): Promise<{
    user: AuthUser;
    payload: JwtPayload;
    refreshToken: string;
}>;
export declare function login(input: LoginInput): Promise<{
    user: AuthUser;
    payload: JwtPayload;
    refreshToken: string;
}>;
export declare function authenticateWithGoogle(input: {
    googleId: string;
    email: string;
    name: string;
}): Promise<{
    user: AuthUser;
    payload: JwtPayload;
    refreshToken: string;
}>;
export declare function unlinkGoogleFromUser(userId: string): Promise<AuthUser>;
//# sourceMappingURL=auth.service.d.ts.map
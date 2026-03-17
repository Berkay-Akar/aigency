export { authRoutes } from './auth.routes';
export { authenticate, getUser } from './auth.middleware';
export { register, login, hashPassword, verifyPassword } from './auth.service';
export type { RegisterInput, LoginInput, JwtPayload, AuthUser } from './auth.schema';

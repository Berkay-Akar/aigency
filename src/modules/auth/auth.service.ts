import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import type { RegisterInput, LoginInput, AuthUser, JwtPayload } from './auth.schema';

const SALT_ROUNDS = 12;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function makeSlugUnique(base: string): string {
  return `${base}-${Date.now().toString(36)}`;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function buildJwtPayload(user: AuthUser): JwtPayload {
  return {
    sub: user.id,
    email: user.email,
    workspaceId: user.workspaceId,
    role: user.role,
  };
}

export function sanitizeUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  workspaceId: string;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    workspaceId: user.workspaceId,
  };
}

export async function register(
  input: RegisterInput,
): Promise<{ user: AuthUser; payload: JwtPayload }> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw Object.assign(new Error('Email already in use'), { statusCode: 409 });
  }

  const passwordHash = await hashPassword(input.password);

  const baseSlug = generateSlug(input.workspaceName);
  const slug = makeSlugUnique(baseSlug);

  const workspace = await prisma.workspace.create({
    data: {
      name: input.workspaceName,
      slug,
      ownerId: 'pending', // updated after user creation
    },
  });

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      role: 'OWNER',
      workspaceId: workspace.id,
    },
  });

  // backfill ownerId now that we have the user id
  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { ownerId: user.id },
  });

  const authUser = sanitizeUser({ ...user, role: user.role.toString() });
  return { user: authUser, payload: buildJwtPayload(authUser) };
}

export async function login(
  input: LoginInput,
): Promise<{ user: AuthUser; payload: JwtPayload }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  const valid = await verifyPassword(input.password, user.passwordHash);

  if (!valid) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  const authUser = sanitizeUser({ ...user, role: user.role.toString() });
  return { user: authUser, payload: buildJwtPayload(authUser) };
}

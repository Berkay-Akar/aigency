import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "../../lib/prisma";
import type {
  RegisterInput,
  LoginInput,
  AuthUser,
  JwtPayload,
} from "./auth.schema";

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_DAYS = 30;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function makeSlugUnique(base: string): string {
  return `${base}-${Date.now().toString(36)}`;
}

function refreshTokenExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_TTL_DAYS);
  return d;
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

export async function generateRefreshToken(userId: string): Promise<string> {
  const token = randomUUID();
  await prisma.user.update({
    where: { id: userId },
    data: {
      refreshToken: token,
      refreshTokenExpiresAt: refreshTokenExpiresAt(),
    },
  });
  return token;
}

export async function rotateRefreshToken(
  oldToken: string,
): Promise<{ user: AuthUser; payload: JwtPayload; refreshToken: string }> {
  const user = await prisma.user.findFirst({
    where: { refreshToken: oldToken },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      workspaceId: true,
      refreshToken: true,
      refreshTokenExpiresAt: true,
      passwordHash: true,
      googleId: true,
    },
  });

  if (!user) {
    throw Object.assign(new Error("Invalid refresh token"), {
      statusCode: 401,
    });
  }

  if (!user.refreshTokenExpiresAt || user.refreshTokenExpiresAt < new Date()) {
    // Invalidate the expired token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: null, refreshTokenExpiresAt: null },
    });
    throw Object.assign(new Error("Refresh token expired"), {
      statusCode: 401,
    });
  }

  const newRefreshToken = await generateRefreshToken(user.id);
  const authUser = sanitizeUser({ ...user, role: user.role.toString() });

  return {
    user: authUser,
    payload: buildJwtPayload(authUser),
    refreshToken: newRefreshToken,
  };
}

export async function register(
  input: RegisterInput,
): Promise<{ user: AuthUser; payload: JwtPayload; refreshToken: string }> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw Object.assign(new Error("Email already in use"), { statusCode: 409 });
  }

  const passwordHash = await hashPassword(input.password);

  const baseSlug = generateSlug(input.workspaceName);
  const slug = makeSlugUnique(baseSlug);

  const workspace = await prisma.workspace.create({
    data: {
      name: input.workspaceName,
      slug,
      ownerId: "pending",
    },
  });

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      role: "OWNER",
      workspaceId: workspace.id,
    },
  });

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { ownerId: user.id },
  });

  await prisma.workspaceMember.create({
    data: { userId: user.id, workspaceId: workspace.id, role: "OWNER" },
  });

  const refreshToken = await generateRefreshToken(user.id);
  const authUser = sanitizeUser({ ...user, role: user.role.toString() });
  return { user: authUser, payload: buildJwtPayload(authUser), refreshToken };
}

export async function login(
  input: LoginInput,
): Promise<{ user: AuthUser; payload: JwtPayload; refreshToken: string }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
  }

  if (!user.passwordHash) {
    throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
  }

  const valid = await verifyPassword(input.password, user.passwordHash);

  if (!valid) {
    throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
  }

  const refreshToken = await generateRefreshToken(user.id);
  const authUser = sanitizeUser({ ...user, role: user.role.toString() });
  return { user: authUser, payload: buildJwtPayload(authUser), refreshToken };
}

export async function authenticateWithGoogle(input: {
  googleId: string;
  email: string;
  name: string;
}): Promise<{ user: AuthUser; payload: JwtPayload; refreshToken: string }> {
  async function logGoogleEvent(
    eventType: "GOOGLE_LINKED" | "GOOGLE_UNLINKED",
    userId: string | null,
  ): Promise<void> {
    await prisma.authAuditLog.create({
      data: {
        eventType,
        userId,
        email: input.email,
        provider: "google",
        providerSubject: input.googleId,
      },
    });
  }

  const byGoogle = await prisma.user.findUnique({
    where: { googleId: input.googleId },
  });

  if (byGoogle) {
    const refreshToken = await generateRefreshToken(byGoogle.id);
    const authUser = sanitizeUser({
      ...byGoogle,
      role: byGoogle.role.toString(),
    });
    return { user: authUser, payload: buildJwtPayload(authUser), refreshToken };
  }

  const byEmail = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (byEmail) {
    if (byEmail.googleId && byEmail.googleId !== input.googleId) {
      throw Object.assign(
        new Error("This email is linked to another Google account"),
        {
          statusCode: 409,
        },
      );
    }

    const updated = await prisma.user.update({
      where: { id: byEmail.id },
      data: { googleId: input.googleId },
    });
    await logGoogleEvent("GOOGLE_LINKED", updated.id);

    const refreshToken = await generateRefreshToken(updated.id);
    const authUser = sanitizeUser({
      ...updated,
      role: updated.role.toString(),
    });
    return { user: authUser, payload: buildJwtPayload(authUser), refreshToken };
  }

  const baseSlug = generateSlug(input.name);
  const slug = makeSlugUnique(baseSlug);

  const workspace = await prisma.workspace.create({
    data: {
      name: `${input.name}'s workspace`,
      slug,
      ownerId: "pending",
    },
  });

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: null,
      googleId: input.googleId,
      role: "OWNER",
      workspaceId: workspace.id,
    },
  });

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { ownerId: user.id },
  });

  await prisma.workspaceMember.create({
    data: { userId: user.id, workspaceId: workspace.id, role: "OWNER" },
  });

  const refreshToken = await generateRefreshToken(user.id);
  await logGoogleEvent("GOOGLE_LINKED", user.id);
  const authUser = sanitizeUser({ ...user, role: user.role.toString() });
  return { user: authUser, payload: buildJwtPayload(authUser), refreshToken };
}

export async function unlinkGoogleFromUser(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }
  if (!user.googleId) {
    throw Object.assign(new Error("Google is not linked"), { statusCode: 400 });
  }
  if (!user.passwordHash) {
    throw Object.assign(new Error("Set a password before unlinking Google"), {
      statusCode: 400,
    });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { googleId: null },
  });

  await prisma.authAuditLog.create({
    data: {
      eventType: "GOOGLE_UNLINKED",
      userId: updated.id,
      email: updated.email,
      provider: "google",
    },
  });

  return sanitizeUser({ ...updated, role: updated.role.toString() });
}

/**
 * Build a JWT payload for any workspace the user is a member of.
 * Used by POST /brands to return a token for the newly created workspace.
 */
export function buildWorkspaceJwtPayload(
  userId: string,
  email: string,
  workspaceId: string,
  role: string,
): JwtPayload {
  return { sub: userId, email, workspaceId, role };
}

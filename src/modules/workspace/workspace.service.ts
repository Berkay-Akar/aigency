import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { hashPassword } from '../auth/auth.service';
import { env } from '../../config/env';
import { sendWorkspaceInviteEmail } from '../../services/email/resend.service';
import type {
  UpdateWorkspaceInput,
  InviteMemberInput,
  AcceptInviteInput,
  SafeUser,
  WorkspaceInfo,
} from './workspace.schema';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  workspaceId: true,
  createdAt: true,
} as const;

export async function getWorkspace(workspaceId: string): Promise<WorkspaceInfo> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    throw Object.assign(new Error('Workspace not found'), { statusCode: 404 });
  }

  return workspace;
}

export async function updateWorkspace(
  workspaceId: string,
  input: UpdateWorkspaceInput,
): Promise<WorkspaceInfo> {
  return prisma.workspace.update({
    where: { id: workspaceId },
    data: { name: input.name },
  });
}

export async function getMembers(workspaceId: string): Promise<SafeUser[]> {
  return prisma.user.findMany({
    where: { workspaceId },
    select: SAFE_USER_SELECT,
    orderBy: { createdAt: 'asc' },
  });
}

export async function inviteMember(
  workspaceId: string,
  invitedById: string,
  input: InviteMemberInput,
): Promise<{ inviteId: string; expiresAt: Date }> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true },
  });
  if (!workspace) {
    throw Object.assign(new Error('Workspace not found'), { statusCode: 404 });
  }

  const userExists = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (userExists) {
    throw Object.assign(new Error('Email already in use'), { statusCode: 409 });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const invite = await prisma.workspaceInvite.create({
    data: {
      email: input.email,
      role: input.role,
      workspaceId,
      invitedById,
      tokenHash,
      expiresAt,
    },
  });

  const inviteLink = `${env.APP_URL}/accept-invite?token=${rawToken}`;
  await sendWorkspaceInviteEmail({
    to: input.email,
    workspaceName: workspace.name,
    inviteLink,
    role: input.role,
  });

  return { inviteId: invite.id, expiresAt: invite.expiresAt };
}

export async function acceptInvite(input: AcceptInviteInput): Promise<SafeUser> {
  const tokenHash = crypto.createHash('sha256').update(input.token).digest('hex');
  const invite = await prisma.workspaceInvite.findUnique({
    where: { tokenHash },
  });
  if (!invite) {
    throw Object.assign(new Error('Invalid invite token'), { statusCode: 400 });
  }
  if (invite.consumedAt) {
    throw Object.assign(new Error('Invite already used'), { statusCode: 409 });
  }
  if (invite.expiresAt < new Date()) {
    throw Object.assign(new Error('Invite expired'), { statusCode: 410 });
  }

  const existing = await prisma.user.findUnique({
    where: { email: invite.email },
    select: { id: true },
  });
  if (existing) {
    throw Object.assign(new Error('Email already in use'), { statusCode: 409 });
  }

  const passwordHash = await hashPassword(input.password);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: invite.email,
        name: input.name,
        passwordHash,
        role: invite.role,
        workspaceId: invite.workspaceId,
      },
      select: SAFE_USER_SELECT,
    });

    await tx.workspaceInvite.update({
      where: { id: invite.id },
      data: {
        consumedAt: new Date(),
        acceptedById: user.id,
      },
    });

    return user;
  });
}

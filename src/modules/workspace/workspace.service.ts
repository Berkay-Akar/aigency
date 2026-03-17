import { prisma } from '../../lib/prisma';
import { hashPassword } from '../auth/auth.service';
import type { UpdateWorkspaceInput, InviteMemberInput, SafeUser, WorkspaceInfo } from './workspace.schema';

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
  input: InviteMemberInput,
): Promise<SafeUser> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw Object.assign(new Error('Email already in use'), { statusCode: 409 });
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      workspaceId,
    },
    select: SAFE_USER_SELECT,
  });
}

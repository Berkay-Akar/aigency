import { prisma } from '../../lib/prisma';

export async function getBalance(workspaceId: string): Promise<number> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { credits: true },
  });

  if (!workspace) {
    throw Object.assign(new Error('Workspace not found'), { statusCode: 404 });
  }

  return workspace.credits;
}

export async function deductCredits(
  workspaceId: string,
  amount: number,
): Promise<number> {
  if (amount <= 0) throw Object.assign(new Error('Amount must be positive'), { statusCode: 400 });

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { credits: true },
  });

  if (!workspace) {
    throw Object.assign(new Error('Workspace not found'), { statusCode: 404 });
  }

  if (workspace.credits < amount) {
    throw Object.assign(new Error('Insufficient credits'), { statusCode: 402 });
  }

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { credits: { decrement: amount } },
    select: { credits: true },
  });

  return updated.credits;
}

export async function addCredits(
  workspaceId: string,
  amount: number,
): Promise<number> {
  if (amount <= 0) throw Object.assign(new Error('Amount must be positive'), { statusCode: 400 });

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { credits: { increment: amount } },
    select: { credits: true },
  });

  return updated.credits;
}

export async function refundCredits(
  workspaceId: string,
  amount: number,
): Promise<number> {
  return addCredits(workspaceId, amount);
}

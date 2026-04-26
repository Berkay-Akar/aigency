import { prisma } from "../../lib/prisma";
import type { CreateBrandInput, BrandListItem } from "./brand.schema";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function listBrands(userId: string): Promise<BrandListItem[]> {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: { select: { id: true, name: true, slug: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return memberships.map((m) => ({
    workspaceId: m.workspaceId,
    name: m.workspace.name,
    slug: m.workspace.slug,
    role: m.role,
    joinedAt: m.joinedAt,
  }));
}

export async function createBrand(
  userId: string,
  input: CreateBrandInput,
): Promise<BrandListItem> {
  const baseSlug = generateSlug(input.name);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const workspace = await prisma.workspace.create({
    data: { name: input.name, slug, ownerId: userId, credits: 0 },
  });

  const member = await prisma.workspaceMember.create({
    data: { userId, workspaceId: workspace.id, role: "OWNER" },
  });

  return {
    workspaceId: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    role: member.role,
    joinedAt: member.joinedAt,
  };
}

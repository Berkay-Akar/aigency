import type { BrandKit } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import type { BrandKitUpdateInput } from "./brand-kit.schema";

export async function getBrandKit(
  workspaceId: string,
): Promise<BrandKit | null> {
  return prisma.brandKit.findUnique({ where: { workspaceId } });
}

/**
 * Partial upsert — only fields explicitly sent in `input` are written.
 * Undefined fields are stripped before the Prisma call so nothing is zeroed out.
 */
export async function upsertBrandKit(
  workspaceId: string,
  input: BrandKitUpdateInput,
): Promise<BrandKit> {
  // Strip undefined so Prisma doesn't accidentally null existing columns
  const data = Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined),
  ) as BrandKitUpdateInput;

  return prisma.brandKit.upsert({
    where: { workspaceId },
    create: { workspaceId, ...data },
    update: data,
  });
}

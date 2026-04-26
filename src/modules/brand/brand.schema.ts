import { z } from "zod";

export const CreateBrandSchema = z.object({
  name: z.string().min(2).max(100),
});

export type CreateBrandInput = z.infer<typeof CreateBrandSchema>;

export interface BrandListItem {
  workspaceId: string;
  name: string;
  slug: string;
  role: string;
  joinedAt: Date;
}

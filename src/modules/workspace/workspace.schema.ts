import { z } from 'zod';

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100),
});

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['MEMBER', 'OWNER']).default('MEMBER'),
});

export const AcceptInviteSchema = z.object({
  token: z.string().min(20),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(128),
});

export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
export type AcceptInviteInput = z.infer<typeof AcceptInviteSchema>;

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: string;
  workspaceId: string;
  createdAt: Date;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: Date;
}

import type { UpdateWorkspaceInput, InviteMemberInput, AcceptInviteInput, SafeUser, WorkspaceInfo } from './workspace.schema';
export declare function getWorkspace(workspaceId: string): Promise<WorkspaceInfo>;
export declare function updateWorkspace(workspaceId: string, input: UpdateWorkspaceInput): Promise<WorkspaceInfo>;
export declare function getMembers(workspaceId: string): Promise<SafeUser[]>;
export declare function inviteMember(workspaceId: string, invitedById: string, input: InviteMemberInput): Promise<{
    inviteId: string;
    expiresAt: Date;
}>;
export declare function acceptInvite(input: AcceptInviteInput): Promise<SafeUser>;
//# sourceMappingURL=workspace.service.d.ts.map
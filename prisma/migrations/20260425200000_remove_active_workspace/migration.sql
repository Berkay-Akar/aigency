-- AlterTable: remove activeWorkspaceId — brand switching is now managed
-- client-side via multiple stored JWT tokens (one per brand/workspace).
ALTER TABLE "User" DROP COLUMN IF EXISTS "activeWorkspaceId";

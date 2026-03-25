-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleId" TEXT;

-- AlterTable: allow OAuth-only users
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

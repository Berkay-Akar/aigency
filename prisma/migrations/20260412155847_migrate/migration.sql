-- AlterTable
ALTER TABLE "AiGenerationJob" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DiscoverPost" ALTER COLUMN "tags" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OutboxJob" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PaymentTransaction" ALTER COLUMN "updatedAt" DROP DEFAULT;

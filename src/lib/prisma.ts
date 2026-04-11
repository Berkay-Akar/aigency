import { PrismaClient, type Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const clientOptions: Prisma.PrismaClientOptions = {
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['warn', 'error'],
};

/**
 * Production: tek PrismaClient (global). Development: global kullanma — tsx watch
 * sonrası eski client kalıp yeni şemadaki modeller (ör. aiGenerationJob) undefined kalıyordu.
 */
export const prisma =
  process.env.NODE_ENV === 'production'
    ? (globalForPrisma.prisma ??= new PrismaClient(clientOptions))
    : new PrismaClient(clientOptions);

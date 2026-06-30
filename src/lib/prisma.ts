import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

/** Dev hot-reload can keep a stale Prisma client after `prisma generate` / migrate. */
function isStalePrismaClient(client: PrismaClient): boolean {
  const companyFields = (client as { _dmmf?: { datamodel?: { models?: Array<{ name: string; fields?: Array<{ name: string }> }> } } })
    ._dmmf?.datamodel?.models?.find(m => m.name === 'Company')?.fields;
  const hasShiftCompanyFields =
    companyFields?.some(f => f.name === 'enabledShiftTypes') &&
    companyFields?.some(f => f.name === 'shiftRegistrationRequired');

  return (
    !('shiftAssignment' in client) ||
    !('shiftAvailability' in client) ||
    !hasShiftCompanyFields
  );
}

let prismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  if (isStalePrismaClient(prismaClient)) {
    void prismaClient.$disconnect().catch(() => {});
    prismaClient = createPrismaClient();
  }
  globalForPrisma.prisma = prismaClient;
}

export const prisma = prismaClient;

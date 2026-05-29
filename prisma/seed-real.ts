import { PrismaClient } from '@prisma/client';
import { seedReal } from './seed-real-fn';

const prisma = new PrismaClient();

async function main() {
  await seedReal(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

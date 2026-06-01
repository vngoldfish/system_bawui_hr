/**
 * Script to delete ALL payroll records
 * Usage: npx ts-node scripts/delete-all-payroll.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Deleting all payroll records...\n');

  try {
    const result = await prisma.payrollRecord.deleteMany({});

    console.log(`✅ Deleted ${result.count} payroll records successfully!\n`);
    console.log('📝 Next steps:');
    console.log('   1. Go to /payroll');
    console.log('   2. Create new payroll records');
    console.log('   3. Verify 会社負担分 has data\n');

  } catch (error) {
    console.error('❌ Error deleting records:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

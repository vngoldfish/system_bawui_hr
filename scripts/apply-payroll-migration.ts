/**
 * Script to apply payroll breakdown migration
 * Run: npx ts-node scripts/apply-payroll-migration.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Applying payroll breakdown migration...\n');

  try {
    // 1. Create salary_adjustments table
    console.log('1️⃣ Creating salary_adjustments table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "salary_adjustments" (
        "id" TEXT NOT NULL,
        "employeeId" TEXT NOT NULL,
        "effectiveFrom" TEXT NOT NULL,
        "oldBaseSalary" DOUBLE PRECISION NOT NULL,
        "newBaseSalary" DOUBLE PRECISION NOT NULL,
        "oldHourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "newHourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "oldDailyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "newDailyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "reason" TEXT NOT NULL,
        "adjustedBy" TEXT,
        "adjustedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "salary_adjustments_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('   ✅ salary_adjustments table created\n');

    // 2. Create indexes
    console.log('2️⃣ Creating indexes...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "salary_adjustments_employeeId_effectiveFrom_idx"
      ON "salary_adjustments"("employeeId", "effectiveFrom");
    `);
    console.log('   ✅ Indexes created\n');

    // 3. Add foreign key
    console.log('3️⃣ Adding foreign key constraint...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "salary_adjustments"
        ADD CONSTRAINT "salary_adjustments_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `);
      console.log('   ✅ Foreign key added\n');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('   ℹ️ Foreign key already exists, skipping\n');
      } else {
        throw e;
      }
    }

    // 4. Add columns to payroll_records
    console.log('4️⃣ Adding columns to payroll_records...');

    const columns = [
      { name: 'healthInsuranceCompany', type: 'DOUBLE PRECISION NOT NULL DEFAULT 0' },
      { name: 'pensionCompany', type: 'DOUBLE PRECISION NOT NULL DEFAULT 0' },
      { name: 'employmentInsuranceCompany', type: 'DOUBLE PRECISION NOT NULL DEFAULT 0' },
      { name: 'workersCompCompany', type: 'DOUBLE PRECISION NOT NULL DEFAULT 0' },
      { name: 'healthInsuranceEmployee', type: 'DOUBLE PRECISION NOT NULL DEFAULT 0' },
      { name: 'pensionEmployee', type: 'DOUBLE PRECISION NOT NULL DEFAULT 0' },
      { name: 'employmentInsuranceEmployee', type: 'DOUBLE PRECISION NOT NULL DEFAULT 0' },
      { name: 'residentTax', type: 'DOUBLE PRECISION NOT NULL DEFAULT 0' },
      { name: 'incomeTax', type: 'DOUBLE PRECISION NOT NULL DEFAULT 0' },
      { name: 'nursingCareInsurance', type: 'DOUBLE PRECISION NOT NULL DEFAULT 0' },
      { name: 'totalCompanyCost', type: 'DOUBLE PRECISION NOT NULL DEFAULT 0' },
    ];

    for (const col of columns) {
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "payroll_records"
          ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type};
        `);
        console.log(`   ✅ Added column: ${col.name}`);
      } catch (e: any) {
        if (e.message.includes('already exists')) {
          console.log(`   ℹ️ Column ${col.name} already exists`);
        } else {
          console.error(`   ❌ Failed to add ${col.name}:`, e.message);
        }
      }
    }
    console.log('');

    // 5. Add baseSalaryAtHire to employees
    console.log('5️⃣ Adding baseSalaryAtHire to employees...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "employees"
        ADD COLUMN IF NOT EXISTS "baseSalaryAtHire" DOUBLE PRECISION NOT NULL DEFAULT 0;
      `);
      console.log('   ✅ baseSalaryAtHire column added\n');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('   ℹ️ Column baseSalaryAtHire already exists\n');
      } else {
        throw e;
      }
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. Run: npx prisma generate');
    console.log('   2. Create new payroll records to see 会社負担分 data');
    console.log('   3. Old records will show ¥0 until recalculated\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
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

/**
 * Script to delete and recreate payroll records for current month
 * Usage: npx ts-node scripts/recreate-payroll.ts
 */

import { PrismaClient } from '@prisma/client';
import { calculatePayrollDetails } from '../src/lib/payroll-calculator';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Recreating payroll records...\n');

  const month = '2026-06'; // Current month

  try {
    // 1. Delete existing records for this month
    const deleted = await prisma.payrollRecord.deleteMany({
      where: { month },
    });
    console.log(`🗑️  Deleted ${deleted.count} existing records for ${month}\n`);

    // 2. Get all active employees
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: { dependents: true },
    });

    console.log(`👥 Found ${employees.length} active employees\n`);

    // 3. Create new payroll records
    let successCount = 0;
    let errorCount = 0;

    for (const emp of employees) {
      try {
        // Calculate payroll details
        const details = calculatePayrollDetails({
          baseSalary: emp.salary,
          salaryType: emp.salaryType || '月給',
          workDays: 20,
          hourlyRate: emp.hourlyRate || 0,
          dailyRate: emp.dailyRate || 0,
          overtimeHours: 0,
          benefits: emp.benefits,
          birthDate: emp.birthDate?.toISOString(),
          month,
          dependents: emp.dependents,
          dependentsCount: emp.dependents.length,
        });

        console.log('Details for', emp.employeeCode, ':', JSON.stringify(details, null, 2));

        // Create payroll record with ALL 11 breakdown fields
        await prisma.payrollRecord.create({
          data: {
            employeeId: emp.id,
            month,
            baseSalary: details.baseSalary,
            overtimePay: details.overtimePay,
            bonus: details.bonus,
            deductions: 0,
            tax: details.incomeTax,
            insurance: details.healthInsurance + details.pension + details.employmentInsurance,
            netSalary: details.netSalary,
            paymentDate: new Date(`${month}-25`),
            status: 'PENDING',
            workDays: 20,
            workHours: details.workHours,
            overtimeHours: 0,
            absentDays: 0,
            // ✅ 11 BREAKDOWN FIELDS
            healthInsuranceCompany: details.healthInsuranceCompany,
            pensionCompany: details.pensionCompany,
            employmentInsuranceCompany: details.employmentInsuranceCompany,
            workersCompCompany: details.workersCompCompany,
            healthInsuranceEmployee: details.healthInsuranceEmployee,
            pensionEmployee: details.pensionEmployee,
            employmentInsuranceEmployee: details.employmentInsuranceEmployee,
            residentTax: details.residentTax,
            incomeTax: details.incomeTax,
            nursingCareInsurance: details.nursingCareInsurance,
            totalCompanyCost: details.totalCompanyCost,
          },
        });

        console.log(`✅ Created payroll for ${emp.lastName} ${emp.firstName} (${emp.employeeCode})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed for ${emp.employeeCode}:`, error);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total: ${employees.length}\n`);

    console.log('✅ Payroll recreation completed!\n');
    console.log('📝 Next steps:');
    console.log('   1. Go to /payroll');
    console.log('   2. View payslips - 会社負担分 will now show correct amounts\n');

  } catch (error) {
    console.error('❌ Error:', error);
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

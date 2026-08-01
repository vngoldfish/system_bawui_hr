import { prisma } from '../src/lib/prisma';
import { getAttendanceMonthForPayroll } from '../src/lib/payroll-helpers';

async function main() {
  const company = await prisma.company.findFirst();
  console.log('Company:', company);

  const employees = await prisma.employee.findMany({
    include: {
      contractType: true,
      employeeContracts: {
        include: { contractType: true }
      }
    }
  });

  console.log(`\nFound ${employees.length} employees:`);
  for (const emp of employees) {
    const activeContract = emp.employeeContracts.find(c => c.isActive) || emp.employeeContracts[0];
    const category = activeContract?.contractType?.category || emp.contractType?.category || 'NONE';
    const payrollMode = activeContract?.contractType?.payrollMode || emp.contractType?.payrollMode || 'NONE';
    console.log(`- ID: ${emp.id}, Code: ${emp.employeeCode}, Name: ${emp.lastName} ${emp.firstName}, Role: ${emp.role}, Category: ${category}, payrollMode: ${payrollMode}`);
  }

  const attendanceCount = await prisma.attendanceRecord.count();
  console.log(`\nTotal attendance records in DB: ${attendanceCount}`);

  // Let's get unique months in attendance records
  const uniqueMonths = await prisma.$queryRaw<Array<{ month: string }>>`
    SELECT DISTINCT TO_CHAR("date", 'YYYY-MM') as month FROM "attendance_records" ORDER BY month DESC
  `;
  console.log('\nUnique months with attendance:');
  console.log(uniqueMonths);

  // Let's get attendance records of the last month
  if (uniqueMonths.length > 0) {
    const latestMonth = uniqueMonths[0].month;
    const records = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: new Date(`${latestMonth}-01T00:00:00+09:00`),
          lte: new Date(`${latestMonth}-31T23:59:59+09:00`),
        }
      },
      select: {
        employeeId: true,
        employee: { select: { lastName: true, firstName: true } },
        date: true,
        status: true,
      }
    });
    console.log(`\nAttendance records for ${latestMonth} (Total ${records.length}):`);
    const countByEmp = new Map<string, number>();
    for (const r of records) {
      const name = `${r.employee.lastName} ${r.employee.firstName}`;
      countByEmp.set(name, (countByEmp.get(name) || 0) + 1);
    }
    for (const [name, count] of countByEmp.entries()) {
      console.log(`- ${name}: ${count} records`);
    }
  }

  const payrollCount = await prisma.payrollRecord.count();
  console.log(`\nTotal payroll records in DB: ${payrollCount}`);
  const payrolls = await prisma.payrollRecord.findMany({
    orderBy: { month: 'desc' },
    include: { employee: true }
  });
  for (const p of payrolls) {
    console.log(`- Month: ${p.month}, Employee: ${p.employee.lastName} ${p.employee.firstName}, Base: ${p.baseSalary}, Net: ${p.netSalary}, Status: ${p.status}`);
  }
}

main().catch(console.error);

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PayrollClient from '@/components/payroll/PayrollClient';

export const dynamic = 'force-dynamic';

const mergeBenefits = (benefits: any) => {
  const defaults = {
    healthInsurance: true,
    pension: true,
    employmentInsurance: true,
    workersComp: true,
    transportation: 15000,
    housing: 30000,
    meal: 10000
  };
  if (!benefits || typeof benefits !== 'object') return defaults;
  return {
    healthInsurance: benefits.healthInsurance ?? defaults.healthInsurance,
    pension: benefits.pension ?? defaults.pension,
    employmentInsurance: benefits.employmentInsurance ?? defaults.employmentInsurance,
    workersComp: benefits.workersComp ?? defaults.workersComp,
    transportation: benefits.transportation ?? defaults.transportation,
    housing: benefits.housing ?? defaults.housing,
    meal: benefits.meal ?? defaults.meal,
  };
};

export default async function PayrollPage() {
  const cookieStore = await cookies();
  const sessionUserCookie = cookieStore.get('session_user');
  
  if (!sessionUserCookie) {
    redirect('/login');
  }
  
  const user = JSON.parse(decodeURIComponent(sessionUserCookie.value));
  
  // Fetch logged-in employee details from DB
  const dbUser = await prisma.employee.findUnique({
    where: { id: user.id },
    include: {
      department: true,
      position: true,
    }
  });

  if (!dbUser) {
    redirect('/login');
  }

  const viewMode = cookieStore.get('view_mode')?.value || 'admin';
  const isEmployee = dbUser.role === 'EMPLOYEE' || viewMode === 'employee';

  if (isEmployee) {
    const hireDate = new Date(dbUser.hireDate);
    const hireYear = hireDate.getFullYear();
    const hireMonth = hireDate.getMonth() + 1;
    const hireMonthStr = `${hireYear}-${String(hireMonth).padStart(2, '0')}`;

    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth() + 1;
    const nowMonthStr = `${nowYear}-${String(nowMonth).padStart(2, '0')}`;

    // 1. Regular Employee Mode: Only fetch/generate their own records from hire date to now
    const dbRecords = await prisma.payrollRecord.findMany({
      where: {
        employeeId: dbUser.id,
        month: {
          gte: hireMonthStr,
          lte: nowMonthStr,
        },
      },
      orderBy: { month: 'desc' },
    });

    let records = await Promise.all(dbRecords.map(async (r) => {
      const allowances = r.bonus;
      const totalGross = r.baseSalary + r.overtimePay + allowances;
      
      const healthInsurance = Math.round(r.insurance * 5 / 14.6);
      const pension = Math.round(r.insurance * 9 / 14.6);
      const employmentInsurance = Math.round(r.insurance * 0.3 / 14.6);
      const workersComp = Math.max(0, r.insurance - healthInsurance - pension - employmentInsurance);
      
      const incomeTax = Math.round(r.tax * 2 / 6);
      const residentTax = Math.max(0, r.tax - incomeTax);
      const totalDeductions = r.deductions + r.insurance + r.tax;

      // Query attendance records for this month to get real days/hours
      const startOfMonth = new Date(`${r.month}-01T00:00:00Z`);
      const [year, monthVal] = r.month.split('-').map(Number);
      const endOfMonth = new Date(year, monthVal, 0, 23, 59, 59, 999);

      const attendance = await prisma.attendanceRecord.findMany({
        where: {
          employeeId: r.employeeId,
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          }
        }
      });

      const workDays = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
      const absentDays = attendance.filter(a => a.status === 'ABSENT').length;
      const overtimeHours = attendance.reduce((sum, a) => sum + a.overtimeHours, 0);
      const workHours = workDays * 8;

      return {
        id: r.id,
        employeeId: r.employeeId,
        month: r.month,
        baseSalary: r.baseSalary,
        overtimePay: r.overtimePay,
        allowances,
        healthInsurance,
        pension,
        employmentInsurance,
        workersComp,
        incomeTax,
        residentTax,
        totalGross,
        totalDeductions,
        netSalary: r.netSalary,
        salaryType: dbUser.salaryType || '月給',
        workDays: workDays || 22,
        workHours: workHours || 176,
        overtimeHours: Math.round(overtimeHours * 10) / 10 || 0,
        absentDays: absentDays || 0,
        status: r.status,
        paymentDate: r.paymentDate ? r.paymentDate.toISOString() : undefined,
      };
    }));

    // Generate monthly historical payslips if DB is currently empty for this user
    if (records.length === 0) {
      const hire = new Date(dbUser.hireDate);
      const now = new Date();
      const current = new Date(hire.getFullYear(), hire.getMonth(), 1);
      const generated: any[] = [];
      
      while (current <= now) {
        const monthStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        
        const baseSalary = dbUser.salary || 450000;
        const overtimeHours = (dbUser.firstName.length + current.getFullYear() + (current.getMonth() + 1)) % 15;
        const hourlyEquiv = baseSalary / 176;
        const overtimePay = Math.round(hourlyEquiv * 1.25 * overtimeHours);
        const allowances = 15000 + 30000 + 10000; // transportation, housing, meal
        const totalGross = baseSalary + overtimePay + allowances;
        
        const healthInsurance = Math.round(totalGross * 0.05);
        const pension = Math.round(totalGross * 0.09);
        const employmentInsurance = Math.round(totalGross * 0.003);
        const workersComp = Math.round(totalGross * 0.003);
        const incomeTax = Math.round(totalGross * 0.02);
        const residentTax = Math.round(totalGross * 0.04);
        const totalDeductions = healthInsurance + pension + employmentInsurance + workersComp + incomeTax + residentTax;
        const netSalary = totalGross - totalDeductions;

        generated.push({
          id: `gen-${dbUser.id}-${monthStr}`,
          employeeId: dbUser.id,
          month: monthStr,
          baseSalary,
          overtimePay,
          allowances,
          healthInsurance,
          pension,
          employmentInsurance,
          workersComp,
          incomeTax,
          residentTax,
          totalGross,
          totalDeductions,
          netSalary,
          salaryType: dbUser.salaryType || '月給',
          workDays: 22,
          workHours: 176,
          overtimeHours,
          absentDays: 0,
          status: 'PAID',
          paymentDate: `${monthStr}-25`,
        });
        
        current.setMonth(current.getMonth() + 1);
      }
      
      records = generated.reverse();
    }

    const singleEmployeeList = [{
      id: dbUser.id,
      employeeCode: dbUser.employeeCode,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      firstNameKana: dbUser.firstNameKana || '',
      lastNameKana: dbUser.lastNameKana || '',
      department: dbUser.department?.name || '未所属',
      position: dbUser.position?.name || '一般社員',
      salary: dbUser.salary || 0,
      salaryType: dbUser.salaryType || '月給',
      hourlyRate: dbUser.hourlyRate || 0,
      dailyRate: dbUser.dailyRate || 0,
      contractType: '正社員',
      benefits: mergeBenefits(dbUser.benefits),
    }];

    return (
      <DashboardLayout title="給与明細" subtitle={`${dbUser.lastName} ${dbUser.firstName} さんの給与明細書一覧`}>
        <div className="space-y-6">
          <PayrollClient 
            employees={singleEmployeeList} 
            initialRecords={records} 
            payrollSettings={{ cutoffDay: '末日', payday: '25' }} 
            isEmployeeMode={true}
          />
        </div>
      </DashboardLayout>
    );
  } else {
    // 2. Admin/Manager Mode: Fetch all DB employees
    const dbEmployees = await prisma.employee.findMany({
      include: {
        department: true,
        position: true,
        employeeContracts: {
          include: {
            contractType: true
          }
        }
      }
    });

    const employees = dbEmployees.map(emp => ({
      id: emp.id,
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      firstNameKana: emp.firstNameKana || '',
      lastNameKana: emp.lastNameKana || '',
      department: emp.department?.name || '未所属',
      position: emp.position?.name || '役職なし',
      salary: emp.salary || 0,
      salaryType: emp.salaryType || '月給',
      hourlyRate: emp.hourlyRate || 0,
      dailyRate: emp.dailyRate || 0,
      contractType: emp.employeeContracts?.[0]?.contractType?.name || '正社員',
      benefits: mergeBenefits(emp.benefits),
    }));

    // Fetch existing database records for Admin view
    const dbRecords = await prisma.payrollRecord.findMany({
      orderBy: { month: 'desc' },
    });

    const records = await Promise.all(dbRecords.map(async (r) => {
      const allowances = r.bonus;
      const totalGross = r.baseSalary + r.overtimePay + allowances;
      
      const healthInsurance = Math.round(r.insurance * 5 / 14.6);
      const pension = Math.round(r.insurance * 9 / 14.6);
      const employmentInsurance = Math.round(r.insurance * 0.3 / 14.6);
      const workersComp = Math.max(0, r.insurance - healthInsurance - pension - employmentInsurance);
      
      const incomeTax = Math.round(r.tax * 2 / 6);
      const residentTax = Math.max(0, r.tax - incomeTax);
      const totalDeductions = r.deductions + r.insurance + r.tax;

      const emp = dbEmployees.find(e => e.id === r.employeeId);

      // Query attendance records for this month to get real days/hours
      const startOfMonth = new Date(`${r.month}-01T00:00:00Z`);
      const [year, monthVal] = r.month.split('-').map(Number);
      const endOfMonth = new Date(year, monthVal, 0, 23, 59, 59, 999);

      const attendance = await prisma.attendanceRecord.findMany({
        where: {
          employeeId: r.employeeId,
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          }
        }
      });

      const workDays = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
      const absentDays = attendance.filter(a => a.status === 'ABSENT').length;
      const overtimeHours = attendance.reduce((sum, a) => sum + a.overtimeHours, 0);
      const workHours = workDays * 8;

      return {
        id: r.id,
        employeeId: r.employeeId,
        month: r.month,
        baseSalary: r.baseSalary,
        overtimePay: r.overtimePay,
        allowances,
        healthInsurance,
        pension,
        employmentInsurance,
        workersComp,
        incomeTax,
        residentTax,
        totalGross,
        totalDeductions,
        netSalary: r.netSalary,
        salaryType: emp?.salaryType || '月給',
        workDays: workDays || 22,
        workHours: workHours || 176,
        overtimeHours: Math.round(overtimeHours * 10) / 10 || 0,
        absentDays: absentDays || 0,
        status: r.status,
        paymentDate: r.paymentDate ? r.paymentDate.toISOString() : undefined,
      };
    }));

    return (
      <DashboardLayout title="給与計算" subtitle="給与の自動計算と明細管理">
        <div className="space-y-6">
          <PayrollClient 
            employees={employees} 
            initialRecords={records} 
            payrollSettings={{ cutoffDay: '末日', payday: '25' }} 
            isEmployeeMode={false}
          />
        </div>
      </DashboardLayout>
    );
  }
}

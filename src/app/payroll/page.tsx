import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PayrollClient from '@/components/payroll/PayrollClient';
import { loadPayrollRecordsForAdmin, loadPayrollRecordsForEmployee } from '@/services/payrollService';
import { Suspense } from 'react';

async function PayrollLoader() {
  const cookieStore = await cookies();
  const sessionUserCookie = cookieStore.get('session_user');
  
  if (!sessionUserCookie) {
    redirect('/login');
  }
  
  let user;
  try {
    user = JSON.parse(decodeURIComponent(sessionUserCookie.value));
  } catch (e) {
    redirect('/login');
  }
  
  const dbUser = await prisma.employee.findUnique({
    where: { id: user.id },
    include: {
      department: true,
      position: true,
      dependents: true,
      employeeContracts: {
        include: {
          contractType: true,
        },
      },
    },
  });

  if (!dbUser) {
    redirect('/login');
  }

  const company = await prisma.company.findFirst();

  const viewMode = cookieStore.get('view_mode')?.value || 'admin';
  const isEmployee = dbUser.role === 'EMPLOYEE' || viewMode === 'employee';

  if (isEmployee) {
    const { employees, records } = await loadPayrollRecordsForEmployee(dbUser, company);

    return (
      <PayrollClient 
        employees={employees} 
        initialRecords={records} 
        payrollSettings={{ 
          cutoffDay: company?.salaryCutoffDay || '末日', 
          payday: company?.payday || '25' 
        }} 
        isEmployeeMode={true}
        companyInfo={company ? { name: company.name, address: company.address, healthInsuranceRate: company.healthInsuranceRate, roundingPolicy: company.roundingPolicy, incomeTaxThreshold: company.incomeTaxThreshold } : undefined}
      />
    );
  }

  const dbEmployees = await prisma.employee.findMany({
    include: {
      department: true,
      position: true,
      dependents: true,
      contractType: true,
      employeeContracts: {
        include: {
          contractType: true,
        },
      },
    },
  });

  const { employees, records } = await loadPayrollRecordsForAdmin(dbEmployees, company);

  return (
    <PayrollClient 
      employees={employees} 
      initialRecords={records} 
      payrollSettings={{ 
        cutoffDay: company?.salaryCutoffDay || '末日', 
        payday: company?.payday || '25' 
      }} 
      isEmployeeMode={false}
      companyInfo={company ? { name: company.name, address: company.address, healthInsuranceRate: company.healthInsuranceRate, roundingPolicy: company.roundingPolicy, incomeTaxThreshold: company.incomeTaxThreshold } : undefined}
    />
  );
}

export default function PayrollPage() {
  return (
    <DashboardLayout title="給与計算" subtitle="給与の自動計算 và 明細管理">
      <div className="space-y-6">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>}>
          <PayrollLoader />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ExpensesClient from '@/components/expenses/ExpensesClient';
import { Suspense } from 'react';

async function ExpensesLoader() {
  const cookieStore = await cookies();
  const sessionUserCookie = cookieStore.get('session_user');
  
  if (!sessionUserCookie) {
    redirect('/login');
  }
  
  const user = JSON.parse(decodeURIComponent(sessionUserCookie.value));
  
  const dbUser = await prisma.employee.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    redirect('/login');
  }

  // Fetch all employees with their department and position
  const dbEmployees = await prisma.employee.findMany({
    include: {
      department: true,
      position: true,
    },
    orderBy: [
      { lastName: 'asc' },
      { firstName: 'asc' }
    ]
  });

  // Map to the format needed by ExpensesClient
  const employees = dbEmployees.map(emp => ({
    id: emp.id,
    firstName: emp.firstName,
    lastName: emp.lastName,
    firstNameKana: emp.firstNameKana || '',
    department: emp.department?.name || '未所属',
    position: emp.position?.name || '一般社員',
  }));

  return <ExpensesClient employees={employees} />;
}

export default function ExpensesPage() {
  return (
    <DashboardLayout title="経費管理" subtitle="経費申請・承認・集計">
      <div className="space-y-6">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>}>
          <ExpensesLoader />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}

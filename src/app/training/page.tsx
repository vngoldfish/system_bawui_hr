import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/DashboardLayout';
import TrainingClient from '@/components/training/TrainingClient';
import { Suspense } from 'react';

async function TrainingLoader() {
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

  // Map to the format needed by TrainingClient
  const employees = dbEmployees.map(emp => ({
    id: emp.id,
    firstName: emp.firstName,
    lastName: emp.lastName,
    firstNameKana: emp.firstNameKana || '',
    department: emp.department?.name || '未所属',
    position: emp.position?.name || '一般社員',
  }));

  return <TrainingClient employees={employees} />;
}

export default function TrainingPage() {
  return (
    <DashboardLayout title="研修管理" subtitle="研修プログラム・受講管理・修了証">
      <div className="space-y-6">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>}>
          <TrainingLoader />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}

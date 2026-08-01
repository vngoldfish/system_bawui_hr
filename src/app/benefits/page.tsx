import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BenefitsClient from '@/components/benefits/BenefitsClient';
import { Suspense } from 'react';

async function BenefitsLoader() {
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
  
  // Fetch logged-in employee details from DB to check role/valid session
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

  // Map to the format needed by BenefitsClient
  const employees = dbEmployees.map(emp => ({
    id: emp.id,
    firstName: emp.firstName,
    lastName: emp.lastName,
    firstNameKana: emp.firstNameKana || '',
    department: emp.department?.name || '未所属',
    position: emp.position?.name || '一般社員',
    salary: emp.salary || 0,
    salaryType: emp.salaryType || '月給',
    benefits: emp.benefits || null,
  }));

  return <BenefitsClient employees={employees} />;
}

export default function BenefitsPage() {
  return (
    <DashboardLayout title="福利厚生" subtitle="社会保険・手当・福利厚生の管理">
      <div className="space-y-6">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>}>
          <BenefitsLoader />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}

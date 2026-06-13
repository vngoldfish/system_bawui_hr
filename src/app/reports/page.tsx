import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ReportsClient from '@/components/reports/ReportsClient';
import { Suspense } from 'react';

function calculateAge(birthDate: Date | null) {
  if (!birthDate) return 30; // Default fallback age
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

async function ReportsLoader() {
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

  // Map to the format needed by ReportsClient
  const employees = dbEmployees.map(emp => ({
    id: emp.id,
    firstName: emp.firstName,
    lastName: emp.lastName,
    firstNameKana: emp.firstNameKana || '',
    department: emp.department?.name || '未所属',
    position: emp.position?.name || '一般社員',
    salary: emp.salary || 0,
    salaryType: emp.salaryType || '月給',
    joinDate: emp.hireDate ? emp.hireDate.toISOString().split('T')[0] : '',
    age: calculateAge(emp.birthDate),
  }));

  return <ReportsClient employees={employees} />;
}

export default function ReportsPage() {
  return (
    <DashboardLayout title="レポート・分析" subtitle="人事データの分析・レポート出力">
      <div className="space-y-6">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>}>
          <ReportsLoader />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}

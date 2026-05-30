import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BenefitsClient from '@/components/benefits/BenefitsClient';

export const dynamic = 'force-dynamic';

export default async function BenefitsPage() {
  const cookieStore = await cookies();
  const sessionUserCookie = cookieStore.get('session_user');
  
  if (!sessionUserCookie) {
    redirect('/login');
  }
  
  const user = JSON.parse(decodeURIComponent(sessionUserCookie.value));
  
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

  return (
    <DashboardLayout title="福利厚生" subtitle="社会保険・手当・福利厚生の管理">
      <div className="space-y-6">
        <BenefitsClient employees={employees} />
      </div>
    </DashboardLayout>
  );
}

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PaymentMethodsClient from '@/components/payment-methods/PaymentMethodsClient';

export const dynamic = 'force-dynamic';

export default async function PaymentMethodsPage() {
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

  // Map to the format needed by PaymentMethodsClient
  const employees = dbEmployees.map(emp => ({
    id: emp.id,
    firstName: emp.firstName,
    lastName: emp.lastName,
    firstNameKana: emp.firstNameKana || '',
    lastNameKana: emp.lastNameKana || '',
    department: emp.department?.name || '未所属',
    position: emp.position?.name || '一般社員',
    salary: emp.salary || 0,
    salaryType: emp.salaryType || '月給',
  }));

  return (
    <DashboardLayout title="支給方法管理" subtitle="給与の支給方法・銀行振込・現金支給の管理">
      <div className="space-y-6">
        <PaymentMethodsClient employees={employees} />
      </div>
    </DashboardLayout>
  );
}

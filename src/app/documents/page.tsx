import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DocumentsClient from '@/components/documents/DocumentsClient';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
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

  // Map to the format needed by DocumentsClient
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
    birthDate: emp.birthDate ? emp.birthDate.toISOString().split('T')[0] : '',
    address: emp.address || '',
  }));

  return (
    <DashboardLayout title="書類管理" subtitle="各種証明書・書類の発行管理">
      <div className="space-y-6">
        <DocumentsClient employees={employees} />
      </div>
    </DashboardLayout>
  );
}

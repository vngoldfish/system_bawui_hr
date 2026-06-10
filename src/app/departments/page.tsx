import DashboardLayout from '@/components/layout/DashboardLayout';
import DepartmentsClient from '@/components/departments/DepartmentsClient';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DepartmentsPage() {
  const cookieStore = await cookies();
  const sessionUserCookie = cookieStore.get('session_user');
  if (!sessionUserCookie) {
    redirect('/login');
  }

  const departments = await prisma.department.findMany({
    include: {
      _count: {
        select: { employees: true },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  const serialized = departments.map(d => ({
    id: d.id,
    name: d.name,
    nameKana: d.nameKana,
    description: d.description,
    _count: d._count,
  }));

  return (
    <DashboardLayout title="部署管理" subtitle="部署の情報と人員管理">
      <div className="space-y-6">
        <DepartmentsClient initialDepartments={serialized} />
      </div>
    </DashboardLayout>
  );
}

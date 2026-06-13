import DashboardLayout from '@/components/layout/DashboardLayout';
import DepartmentsClient from '@/components/departments/DepartmentsClient';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export const unstable_instant = {
  prefetch: 'static',
  samples: [
    {
      cookies: [
        { name: 'session_user', value: null }
      ]
    }
  ]
};

async function DepartmentsLoader() {
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

  return <DepartmentsClient initialDepartments={serialized} />;
}

export default function DepartmentsPage() {
  return (
    <DashboardLayout title="部署管理" subtitle="部署の情報と人員管理">
      <div className="space-y-6">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>}>
          <DepartmentsLoader />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}

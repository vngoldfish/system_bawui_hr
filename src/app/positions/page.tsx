import DashboardLayout from '@/components/layout/DashboardLayout';
import PositionsClient from '@/components/positions/PositionsClient';
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

async function PositionsLoader() {
  const cookieStore = await cookies();
  const sessionUserCookie = cookieStore.get('session_user');
  if (!sessionUserCookie) {
    redirect('/login');
  }

  const positions = await prisma.position.findMany({
    include: {
      _count: {
        select: { employees: true },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  const serialized = positions.map(p => ({
    id: p.id,
    name: p.name,
    nameKana: p.nameKana,
    description: p.description,
    allowance: p.allowance,
    _count: p._count,
  }));

  return <PositionsClient initialPositions={serialized} />;
}

export default function PositionsPage() {
  return (
    <DashboardLayout title="役職管理" subtitle="役職の情報と手当の管理">
      <div className="space-y-6">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>}>
          <PositionsLoader />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}

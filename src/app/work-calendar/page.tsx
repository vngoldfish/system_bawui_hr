import DashboardLayout from '@/components/layout/DashboardLayout';
import WorkCalendarClient from '@/components/work-calendar/WorkCalendarClient';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export const unstable_instant = {
  prefetch: 'static',
  samples: [{ cookies: [{ name: 'session_user', value: null }] }],
};

async function WorkCalendarLoader() {
  const cookieStore = await cookies();
  if (!cookieStore.get('session_user')) redirect('/login');

  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  return <WorkCalendarClient departments={departments} />;
}

export default function WorkCalendarPage() {
  return (
    <DashboardLayout title="勤務カレンダー" subtitle="会社休日・契約・シフト・実績の統合ビュー">
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
          </div>
        }
      >
        <WorkCalendarLoader />
      </Suspense>
    </DashboardLayout>
  );
}
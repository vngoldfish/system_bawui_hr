import DashboardLayout from '@/components/layout/DashboardLayout';
import ResidenceCardsClient from '@/components/residence-cards/ResidenceCardsClient';
import { employeeService } from '@/services/employeeService';
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

async function ResidenceCardsLoader() {
  const cookieStore = await cookies();
  const sessionUserCookie = cookieStore.get('session_user');
  if (!sessionUserCookie) {
    redirect('/login');
  }

  const serialized = await employeeService.getForeignEmployees();
  return <ResidenceCardsClient initialEmployees={serialized} />;
}

export default function ResidenceCardsPage() {
  return (
    <DashboardLayout title="外国人管理" subtitle="在留カード・ビザ管理">
      <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>}>
        <ResidenceCardsLoader />
      </Suspense>
    </DashboardLayout>
  );
}

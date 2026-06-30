import DashboardLayout from '@/components/layout/DashboardLayout';
import CompanyCalendarClient from '@/components/company-calendar/CompanyCalendarClient';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export const unstable_instant = {
  prefetch: 'static',
  samples: [{ cookies: [{ name: 'session_user', value: null }] }],
};

async function CompanyCalendarLoader() {
  const cookieStore = await cookies();
  if (!cookieStore.get('session_user')) redirect('/login');
  const year = new Date().getFullYear();
  return <CompanyCalendarClient initialYear={year} />;
}

export default function CompanyCalendarPage() {
  return (
    <DashboardLayout title="会社カレンダー" subtitle="祝日・会社休業日の管理">
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
          </div>
        }
      >
        <CompanyCalendarLoader />
      </Suspense>
    </DashboardLayout>
  );
}
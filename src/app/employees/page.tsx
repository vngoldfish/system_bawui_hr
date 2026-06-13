import DashboardLayout from '@/components/layout/DashboardLayout';
import EmployeesClient from '@/components/employees/EmployeesClient';
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

async function EmployeesLoader() {
  const cookieStore = await cookies();
  const sessionUserCookie = cookieStore.get('session_user');
  if (!sessionUserCookie) {
    redirect('/login');
  }

  const serialized = await employeeService.getAll();
  return <EmployeesClient initialEmployees={serialized} />;
}

export default function EmployeesPage() {
  return (
    <DashboardLayout title="従業員管理" subtitle="従業員情報の管理">
      <div className="space-y-6">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>}>
          <EmployeesLoader />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}

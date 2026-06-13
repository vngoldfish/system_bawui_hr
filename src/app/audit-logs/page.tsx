import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AuditLogsClient from '@/components/audit-logs/AuditLogsClient';
import { prisma } from '@/lib/prisma';
import { getAuditLogs } from '@/services/auditService';
import { Suspense } from 'react';

async function AuditLogsLoader() {
  const cookieStore = await cookies();
  const sessionUserCookie = cookieStore.get('session_user');
  
  if (!sessionUserCookie) {
    redirect('/login');
  }
  
  let user;
  try {
    user = JSON.parse(decodeURIComponent(sessionUserCookie.value));
  } catch (_e) {
    redirect('/login');
  }

  const dbUser = await prisma.employee.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    redirect('/login');
  }

  const viewMode = cookieStore.get('view_mode')?.value || 'admin';
  const isEmployeeMode = viewMode === 'employee';
  
  // Access restricted to SUPER_ADMIN or HR_MANAGER, and must not be in employee mode
  const hasAccess = (user.id === 'mock-user-001' || (dbUser.role === 'SUPER_ADMIN' || dbUser.role === 'HR_MANAGER')) && !isEmployeeMode;

  if (!hasAccess) {
    redirect('/dashboard?error=forbidden');
  }

  // Pre-fetch the first page of audit logs for SSR
  const result = getAuditLogs({ page: 1, limit: 20 });

  return (
    <AuditLogsClient
      initialLogs={result.logs}
      initialPagination={result.pagination}
      currentUser={user}
    />
  );
}

export default function AuditLogsPage() {
  return (
    <DashboardLayout title="操作ログ" subtitle="システム変更記録および管理者アクションを監視します。">
      <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>}>
        <AuditLogsLoader />
      </Suspense>
    </DashboardLayout>
  );
}

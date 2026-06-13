import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LeaveClient from '@/components/leave/LeaveClient';
import { Suspense } from 'react';

export const unstable_instant = {
  prefetch: 'static',
  samples: [
    {
      cookies: [
        { name: 'session_user', value: null },
        { name: 'view_mode', value: null }
      ]
    }
  ]
};

async function LeaveLoader() {
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
  
  // Fetch user from DB to check role
  const dbUser = await prisma.employee.findUnique({
    where: { id: user.id },
  });
  
  if (!dbUser) {
    redirect('/login');
  }
  
  const viewMode = cookieStore.get('view_mode')?.value || 'admin';
  const isEmployee = dbUser.role === 'EMPLOYEE' || viewMode === 'employee';
  const isDeptManager = dbUser.role === 'DEPARTMENT_MANAGER' && viewMode !== 'employee';
  
  // Fetch employees list
  let employees = [];
  if (isEmployee) {
    const dept = await prisma.department.findUnique({ where: { id: dbUser.departmentId } });
    const pos = await prisma.position.findUnique({ where: { id: dbUser.positionId } });
    employees = [{
      id: dbUser.id,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      firstNameKana: dbUser.firstNameKana || '',
      lastNameKana: dbUser.lastNameKana || '',
      department: dept?.name || '未所属',
      position: pos?.name || '一般社員',
    }];
  } else if (isDeptManager) {
    const dbEmployees = await prisma.employee.findMany({
      where: {
        departmentId: dbUser.departmentId,
      },
      include: {
        department: true,
        position: true,
      },
    });
    employees = dbEmployees.map(emp => ({
      id: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      firstNameKana: emp.firstNameKana || '',
      lastNameKana: emp.lastNameKana || '',
      department: emp.department?.name || '未所属',
      position: emp.position?.name || '役職なし',
    }));
  } else {
    const dbEmployees = await prisma.employee.findMany({
      include: {
        department: true,
        position: true,
      },
    });
    employees = dbEmployees.map(emp => ({
      id: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      firstNameKana: emp.firstNameKana || '',
      lastNameKana: emp.lastNameKana || '',
      department: emp.department?.name || '未所属',
      position: emp.position?.name || '役職なし',
    }));
  }
  
  // Fetch leave requests
  const where: any = {};
  if (isEmployee) {
    where.employeeId = dbUser.id;
  } else if (isDeptManager) {
    where.employee = {
      departmentId: dbUser.departmentId,
    };
  }
  
  const dbLeaves = await prisma.leaveRequest.findMany({
    where,
    orderBy: { startDate: 'desc' },
  });
  
  const leaves = dbLeaves.map(l => ({
    id: l.id,
    employeeId: l.employeeId,
    type: l.type,
    startDate: l.startDate.toISOString().split('T')[0],
    endDate: l.endDate.toISOString().split('T')[0],
    days: Math.ceil((l.endDate.getTime() - l.startDate.getTime()) / 86400000) + 1,
    reason: l.reason,
    status: l.status,
  }));

  return (
    <DashboardLayout title="休暇管理" subtitle={isEmployee ? `${dbUser.lastName} ${dbUser.firstName} さんの休暇申請` : "休暇申請の管理と承認"}>
      <div className="space-y-6">
        <LeaveClient employees={employees} initialLeaves={leaves} isEmployeeMode={isEmployee} currentUserId={dbUser.id} />
      </div>
    </DashboardLayout>
  );
}

export default function LeavePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>}>
      <LeaveLoader />
    </Suspense>
  );
}

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import RolesClient from '@/components/roles/RolesClient';
import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';

function toJSTDateString(date: Date | null | undefined): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(date);
}

async function RolesLoader() {
  const cookieStore = await cookies();
  const sessionUserCookie = cookieStore.get('session_user');
  
  if (!sessionUserCookie) {
    redirect('/login');
  }
  
  let user;
  try {
    user = JSON.parse(decodeURIComponent(sessionUserCookie.value));
  } catch (e) {
    redirect('/login');
  }

  const dbUser = await prisma.employee.findUnique({
    where: { id: user.id },
  });

  if (user.id !== 'mock-user-001' && (!dbUser || dbUser.role !== 'SUPER_ADMIN')) {
    redirect('/dashboard?error=forbidden');
  }

  const dbEmployees = await prisma.employee.findMany({
    include: {
      department: true,
      position: true,
    },
    orderBy: {
      employeeCode: 'asc',
    },
  });

  const dbRolePermissions = await prisma.rolePermission.findMany({
    orderBy: { role: 'asc' },
  });

  const dbPermissions = await prisma.permission.findMany({
    orderBy: [
      { category: 'asc' },
      { key: 'asc' },
    ],
  });

  const employees = dbEmployees.map(emp => ({
    id: emp.id,
    employeeCode: emp.employeeCode,
    firstName: emp.firstName,
    lastName: emp.lastName,
    firstNameKana: emp.firstNameKana,
    lastNameKana: emp.lastNameKana,
    email: emp.email,
    birthDate: toJSTDateString(emp.birthDate),
    department: emp.department?.name || '-',
    position: emp.position?.name || '-',
    role: emp.role,
    password: emp.password,
  }));

  const initialRolePermissions = dbRolePermissions.map(rp => ({
    role: rp.role,
    permission: rp.permission,
  }));

  const initialPermissions = dbPermissions.map(p => ({
    key: p.key,
    category: p.category,
    name: p.name,
    description: p.description || '',
  }));

  return (
    <RolesClient
      employees={employees}
      initialRolePermissions={initialRolePermissions}
      initialPermissions={initialPermissions}
    />
  );
}

export default function RolesPage() {
  return (
    <DashboardLayout title="権限・アカウント管理" subtitle="従業員のログイン情報とシステム権限の設定">
      <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>}>
        <RolesLoader />
      </Suspense>
    </DashboardLayout>
  );
}

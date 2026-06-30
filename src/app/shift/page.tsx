import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ShiftClient from '@/components/shift/ShiftClient';
import { Suspense } from 'react';
import { getShiftCompanySettings } from '@/lib/shift-company-settings-server';

async function ShiftLoader() {
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

  if (!dbUser) {
    redirect('/login');
  }

  // Fetch all employees in database to show their shifts
  const dbEmployees = await prisma.employee.findMany({
    include: {
      department: true,
      contractType: { select: { name: true, category: true } },
    },
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      employeeCode: 'asc',
    },
  });

  // Map to format required by ShiftClient
  let mappedEmployees = dbEmployees.map(emp => ({
    id: emp.id,
    firstName: emp.firstName,
    lastName: emp.lastName,
    firstNameKana: emp.firstNameKana,
    department: emp.department?.name || '未所属',
    position: '',
    contractCategory: emp.contractType?.category || '',
    contractTypeName: emp.contractType?.name || '',
  }));

  // Get role permissions for user's role
  const rpMappings = await prisma.rolePermission.findMany({
    where: { role: dbUser.role },
    select: { permission: true },
  });
  
  const userPermissions = rpMappings.map(rp => rp.permission);
  
  // If the user is SUPER_ADMIN, they have bypass permissions. Otherwise, check for 'attendance:edit'.
  const isReadOnly = user.id !== 'mock-user-001' && dbUser.role !== 'SUPER_ADMIN' && !userPermissions.includes('attendance:edit');

  // Let's implement Department Security Scoping:
  // If the user is SUPER_ADMIN or HR_MANAGER, they can see all departments.
  // For others, if they have 'attendance:view_all_departments' permission (which we will define), they can see all.
  // Otherwise, they are restricted to their own department.
  const hasViewAllPerm = userPermissions.includes('attendance:view_all_departments');
  const restrictToOwnDepartment = user.id !== 'mock-user-001' && dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'HR_MANAGER' && !hasViewAllPerm;

  if (restrictToOwnDepartment) {
    const userDept = await prisma.department.findUnique({
      where: { id: dbUser.departmentId },
    });
    const userDeptName = userDept?.name || '';
    mappedEmployees = mappedEmployees.filter(emp => emp.department === userDeptName);
  }

  const shiftSettings = await getShiftCompanySettings();

  return (
    <ShiftClient
      employees={mappedEmployees}
      isReadOnly={isReadOnly}
      shiftRegistrationRequired={shiftSettings.shiftRegistrationRequired}
      shiftRegistrationPolicy={shiftSettings.shiftRegistrationPolicy}
      enabledShiftTypes={shiftSettings.enabledShiftTypes}
    />
  );
}

export default function ShiftPage() {
  return (
    <DashboardLayout title="シフト管理" subtitle="日次割当と月間シフト表で勤務シフトを管理">
      <div className="space-y-6">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>}>
          <ShiftLoader />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}

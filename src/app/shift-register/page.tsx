import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ShiftAvailabilityClient from '@/components/shift/ShiftAvailabilityClient';
import ShiftRegisterAdminClient from '@/components/shift/ShiftRegisterAdminClient';
import { getNextMonthStr } from '@/lib/shift-availability-helpers';
import { attendanceService } from '@/services/attendanceService';
import { getShiftCompanySettings } from '@/lib/shift-company-settings-server';
import { Suspense } from 'react';
import ShiftWorkflowGuide from '@/components/shift/ShiftWorkflowGuide';

async function ShiftRegisterLoader() {
  const cookieStore = await cookies();
  const sessionUserCookie = cookieStore.get('session_user');
  if (!sessionUserCookie) redirect('/login');

  let user: { id: string; role?: string };
  try {
    user = JSON.parse(decodeURIComponent(sessionUserCookie.value));
  } catch {
    redirect('/login');
  }

  const dbUser = await prisma.employee.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });
  if (!dbUser) redirect('/login');

  const isHrAdmin =
    dbUser.role === 'SUPER_ADMIN' ||
    dbUser.role === 'HR_MANAGER' ||
    user.role === 'SUPER_ADMIN' ||
    user.role === 'HR_MANAGER';

  const [holidays, shiftSettings] = await Promise.all([
    attendanceService.getHolidays(),
    getShiftCompanySettings(),
  ]);

  if (isHrAdmin) {
    const employees = await prisma.employee.findMany({
      where: { status: { in: ['ACTIVE', 'ON_LEAVE'] } },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        contractType: { select: { name: true } },
      },
      orderBy: { employeeCode: 'asc' },
    });

    return (
      <ShiftRegisterAdminClient
        holidays={holidays}
        enabledShiftTypes={shiftSettings.enabledShiftTypes}
        registrationRequired={shiftSettings.shiftRegistrationRequired}
        employees={employees.map(e => ({
          id: e.id,
          employeeCode: e.employeeCode,
          firstName: e.firstName,
          lastName: e.lastName,
          contractTypeName: e.contractType?.name || '',
        }))}
      />
    );
  }

  const targetMonth = getNextMonthStr();

  return (
    <ShiftAvailabilityClient
      employeeName={`${dbUser.lastName} ${dbUser.firstName}`}
      targetMonth={targetMonth}
      holidays={holidays}
      enabledShiftTypes={shiftSettings.enabledShiftTypes}
      registrationRequired={shiftSettings.shiftRegistrationRequired}
    />
  );
}

export default function ShiftRegisterPage() {
  return (
    <DashboardLayout title="勤務・休み希望登録" subtitle="翌月の勤務可能日・休み希望日を登録（管理者はシフト管理で割当）">
      <div className="space-y-4 mb-4">
        <ShiftWorkflowGuide activeStep={1} />
      </div>
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
          </div>
        }
      >
        <ShiftRegisterLoader />
      </Suspense>
    </DashboardLayout>
  );
}
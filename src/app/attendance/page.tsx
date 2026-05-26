import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AttendanceClient from '@/components/attendance/AttendanceClient';
import { employeeService } from '@/services/employeeService';
import { attendanceService } from '@/services/attendanceService';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
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

  const isEmployee = dbUser.role === 'EMPLOYEE';

  let employees: any[] = [];
  let records: any[] = [];
  let holidays: any[] = [];

  if (isEmployee) {
    const [employee, empRecords, allHolidays] = await Promise.all([
      employeeService.getById(user.id),
      attendanceService.getAttendanceRecordsByEmployeeId(user.id),
      attendanceService.getHolidays(),
    ]);
    if (employee) {
      employees = [employee];
    }
    records = empRecords;
    holidays = allHolidays;
  } else {
    const [allEmployees, allRecords, allHolidays] = await Promise.all([
      employeeService.getAll(),
      attendanceService.getAttendanceRecords(),
      attendanceService.getHolidays(),
    ]);
    employees = allEmployees;
    records = allRecords;
    holidays = allHolidays;
  }

  return (
    <DashboardLayout title="勤怠管理" subtitle={isEmployee ? `${user.lastName} ${user.firstName} さんの出退勤管理` : "従業員の出退勤・残業管理"}>
      <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]">読み込み中...</div>}>
        <AttendanceClient 
          initialRecords={records} 
          employees={employees} 
          holidays={holidays} 
          isEmployeeMode={isEmployee} 
        />
      </Suspense>
    </DashboardLayout>
  );
}

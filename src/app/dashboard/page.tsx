import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { dashboardService } from '@/services/dashboardService';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
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

  const viewMode = cookieStore.get('view_mode')?.value || 'admin';
  const isEmployee = dbUser.role === 'EMPLOYEE' || viewMode === 'employee';

  if (isEmployee) {
    // Fetch only the logged-in employee's record
    const emp = await prisma.employee.findUnique({
      where: { id: user.id },
      include: {
        department: true,
        position: true,
        contractType: true,
      },
    });

    const formattedEmployee = emp ? [{
      id: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      firstNameKana: emp.firstNameKana,
      lastNameKana: emp.lastNameKana,
      email: emp.email,
      phone: emp.phone,
      department: emp.department?.name || '-',
      position: emp.position?.name || '-',
      hireDate: emp.hireDate.toISOString().split('T')[0],
      salary: emp.salary,
      status: emp.status,
      nationality: emp.nationality,
      residenceStatus: emp.residenceStatus || '',
      residenceCardNumber: emp.residenceCardNumber || '',
      residenceCardIssueDate: emp.residenceCardIssueDate ? emp.residenceCardIssueDate.toISOString().split('T')[0] : '',
      residenceExpiry: emp.residenceExpiry ? emp.residenceExpiry.toISOString().split('T')[0] : '',
      workRestriction: emp.workRestriction || '',
      contractType: emp.contractType?.name || '-',
      contractStartDate: emp.contractStartDate ? emp.contractStartDate.toISOString().split('T')[0] : '',
      contractEndDate: emp.contractEndDate ? emp.contractEndDate.toISOString().split('T')[0] : '',
      salaryType: emp.salaryType,
      hourlyRate: emp.hourlyRate,
      dailyRate: emp.dailyRate,
      benefits: (emp.benefits as any) || { healthInsurance: false, pension: false, employmentInsurance: false, workersComp: false, transportation: 0, housing: 0, meal: 0 },
      dependents: 0,
      dependentList: [],
    }] : [];

    // Fetch only the logged-in employee's attendance
    const dbAttendance = await prisma.attendanceRecord.findMany({
      where: { employeeId: user.id },
      take: 30,
      orderBy: { date: 'desc' },
    });

    const formattedAttendance = dbAttendance.map(a => ({
      id: a.id,
      employeeId: a.employeeId,
      date: a.date.toISOString().split('T')[0],
      checkIn: a.checkIn ? a.checkIn.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
      checkOut: a.checkOut ? a.checkOut.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
      overtimeHours: a.overtimeHours,
      status: a.status,
      note: a.notes || '',
    }));

    // Fetch only the logged-in employee's leaves
    const dbLeaves = await prisma.leaveRequest.findMany({
      where: { employeeId: user.id },
      orderBy: { startDate: 'desc' },
    });

    const formattedLeaves = dbLeaves.map(l => ({
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
      <DashboardLayout title="ダッシュボード" subtitle="人事管理システムの概要">
        <DashboardClient 
          employees={formattedEmployee as any} 
          attendance={formattedAttendance} 
          leaves={formattedLeaves} 
          isEmployeeMode={true}
          currentUser={user}
        />
      </DashboardLayout>
    );
  }

  // Admin / HR gets all data
  const { employees, attendance, leaves } = await dashboardService.getDashboardData();

  return (
    <DashboardLayout title="ダッシュボード" subtitle="人事管理システムの概要">
      <DashboardClient 
        employees={employees as any} 
        attendance={attendance} 
        leaves={leaves} 
        isEmployeeMode={false}
        currentUser={user}
      />
    </DashboardLayout>
  );
}

import { prisma } from '@/lib/prisma';

function toJSTDateString(date: Date | null | undefined): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(date);
}

export const dashboardService = {
  async getDashboardData() {
    // Fetch all employees including relations
    const dbEmployees = await prisma.employee.findMany({
      include: {
        department: true,
        position: true,
        contractType: true,
        dependents: true,
        shitens: true,
      },
    });

    // Fetch attendance records for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const dbAttendance = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Fetch leave requests
    const dbLeaves = await prisma.leaveRequest.findMany({
      orderBy: {
        startDate: 'desc',
      },
    });

    // Map database employees to Client Component expected interface
    const employees = dbEmployees.map(emp => ({
      id: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      firstNameKana: emp.firstNameKana,
      lastNameKana: emp.lastNameKana,
      email: emp.email,
      phone: emp.phone,
      department: emp.department?.name || '-',
      position: emp.position?.name || '-',
      hireDate: toJSTDateString(emp.hireDate),
      salary: emp.salary,
      status: emp.status,
      nationality: emp.nationality,
      residenceStatus: emp.residenceStatus || '',
      residenceCardNumber: emp.residenceCardNumber || '',
      residenceCardIssueDate: toJSTDateString(emp.residenceCardIssueDate),
      residenceExpiry: toJSTDateString(emp.residenceExpiry),
      workRestriction: emp.workRestriction || '',
      contractType: emp.contractType?.name || '-',
      contractStartDate: toJSTDateString(emp.contractStartDate),
      contractEndDate: toJSTDateString(emp.contractEndDate),
      salaryType: emp.salaryType,
      hourlyRate: emp.hourlyRate,
      dailyRate: emp.dailyRate,
      benefits: (emp.benefits as any) || { healthInsurance: false, pension: false, employmentInsurance: false, workersComp: false, transportation: 0, housing: 0, meal: 0 },
      dependents: emp.dependents.length,
      dependentList: emp.dependents.map(d => ({
        name: d.name,
        relationship: d.relationship,
        birthDate: toJSTDateString(d.birthDate),
        gender: d.gender || '',
        cohabitation: d.cohabitation,
      })),
      shitenIds: emp.shitens.map(s => s.id),
    }));

    // Map attendance records to Client Component expected interface
    const attendance = dbAttendance.map(a => ({
      id: a.id,
      employeeId: a.employeeId,
      date: toJSTDateString(a.date),
      // Extract HH:mm from checkIn/checkOut datetimes
      checkIn: a.checkIn ? a.checkIn.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tokyo' }) : '',
      checkOut: a.checkOut ? a.checkOut.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tokyo' }) : '',
      overtimeHours: a.overtimeHours,
      status: a.status,
      note: a.notes || '',
    }));

    // Map leave requests
    const leaves = dbLeaves.map(l => ({
      id: l.id,
      employeeId: l.employeeId,
      type: l.type,
      startDate: toJSTDateString(l.startDate),
      endDate: toJSTDateString(l.endDate),
      days: Math.ceil((l.endDate.getTime() - l.startDate.getTime()) / 86400000) + 1,
      reason: l.reason,
      status: l.status,
    }));

    // Fetch all branches
    const dbShitens = await prisma.shiten.findMany({
      include: {
        employees: {
          select: { id: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    const shitens = dbShitens.map(s => ({
      id: s.id,
      name: s.name,
      nameKana: s.nameKana || null,
      employeeIds: s.employees.map(e => e.id),
    }));

    return { employees, attendance, leaves, shitens };
  }
};

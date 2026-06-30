import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { getSessionUser } from '@/lib/session';
import { resolveContractPayrollRules } from '@/lib/contract-payroll-rules';
import {
  aggregateAttendanceStats,
  getAttendanceMonthForPayroll,
  getPayrollAttendanceRangeJst,
} from '@/lib/payroll-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    if (viewMode === 'employee' || (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER')) {
      return errorResponse('Forbidden', 403);
    }

    const { searchParams } = new URL(request.url);
    const payrollMonth = searchParams.get('month');
    if (!payrollMonth || !/^\d{4}-\d{2}$/.test(payrollMonth)) {
      return errorResponse('month query (YYYY-MM) is required', 400);
    }

    const company = await prisma.company.findFirst({ select: { roundingPolicy: true } });
    const roundingPolicy = company?.roundingPolicy || 'exact';
    const attendanceMonth = getAttendanceMonthForPayroll(payrollMonth);
    const { startUtc, endUtc } = getPayrollAttendanceRangeJst(payrollMonth);

    const holidays = await prisma.holiday.findMany({
      where: { isActive: true, date: { gte: startUtc, lte: endUtc } },
    });
    const holidayList = holidays.map(h => ({ date: h.date, isActive: h.isActive }));

    const employees = await prisma.employee.findMany({
      where: { status: { in: ['ACTIVE', 'ON_LEAVE'] } },
      include: {
        department: { select: { name: true } },
        contractType: true,
        employeeContracts: {
          where: { isActive: true },
          include: { contractType: true },
        },
      },
      orderBy: { employeeCode: 'asc' },
    });

    const dispatchEmployees = employees.filter(emp => {
      const rules = resolveContractPayrollRules(emp, payrollMonth);
      return rules.payrollMode === 'HOURS_ONLY';
    });

    if (dispatchEmployees.length === 0) {
      return successResponse({
        payrollMonth,
        attendanceMonth,
        rows: [],
        totals: { employees: 0, workHours: 0, workDays: 0 },
      });
    }

    const employeeIds = dispatchEmployees.map(e => e.id);
    const attendance = await prisma.attendanceRecord.findMany({
      where: {
        employeeId: { in: employeeIds },
        date: { gte: startUtc, lte: endUtc },
      },
      orderBy: [{ employeeId: 'asc' }, { date: 'asc' }],
    });

    const rows = dispatchEmployees.map(emp => {
      const empAttendance = attendance.filter(a => a.employeeId === emp.id);
      const overtimeContext = {
        contracts: emp.employeeContracts,
        holidays: holidayList,
      };
      const stats = aggregateAttendanceStats(empAttendance, roundingPolicy, overtimeContext);
      const rules = resolveContractPayrollRules(emp, payrollMonth);

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        department: emp.department?.name || '',
        contractType: rules.contractType.name,
        category: rules.contractType.category,
        workDays: stats.workDays,
        workHours: stats.workHours,
        overtimeHours: stats.overtimeHours,
        absentDays: stats.absentDays,
      };
    });

    const totals = {
      employees: rows.length,
      workHours: Math.round(rows.reduce((s, r) => s + r.workHours, 0) * 10) / 10,
      workDays: rows.reduce((s, r) => s + r.workDays, 0),
    };

    return successResponse({ payrollMonth, attendanceMonth, rows, totals });
  } catch (error) {
    return handleApiError(error);
  }
}
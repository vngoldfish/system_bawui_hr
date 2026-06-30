import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, handleApiError, successResponse } from '@/lib/api-utils';
import { getSessionUser } from '@/lib/session';
import { isContractWorkDay } from '@/lib/attendance-helpers';
import { formatShiftDate, parseMonthBounds } from '@/lib/shift-helpers';
import { getActiveContractForDate } from '@/lib/payroll-helpers';
import { dateOnlyJst } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const departmentId = searchParams.get('departmentId');
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return errorResponse('month query (YYYY-MM) is required', 400);
    }

    const { startUtc, endUtc, year, monthNum } = parseMonthBounds(month);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const dates = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${month}-${String(d).padStart(2, '0')}`;
    });

    const [holidays, employees, shifts, attendance] = await Promise.all([
      prisma.holiday.findMany({
        where: { isActive: true, date: { gte: startUtc, lte: endUtc } },
        orderBy: { date: 'asc' },
      }),
      prisma.employee.findMany({
        where: {
          status: { in: ['ACTIVE', 'ON_LEAVE'] },
          ...(departmentId ? { departmentId } : {}),
        },
        include: {
          department: { select: { id: true, name: true } },
          employeeContracts: {
            where: { isActive: true },
            select: {
              id: true,
              isActive: true,
              startDate: true,
              endDate: true,
              workDays: true,
              defaultCheckIn: true,
              defaultCheckOut: true,
            },
          },
        },
        orderBy: { employeeCode: 'asc' },
      }),
      prisma.shiftAssignment.findMany({
        where: { date: { gte: startUtc, lte: endUtc } },
      }),
      prisma.attendanceRecord.findMany({
        where: {
          date: { gte: startUtc, lte: endUtc },
          ...(departmentId ? { employee: { departmentId } } : {}),
        },
        select: {
          id: true,
          employeeId: true,
          date: true,
          status: true,
          checkIn: true,
          checkOut: true,
        },
      }),
    ]);

    const holidayByDate = new Map(
      holidays.map(h => [dateOnlyJst(h.date), { id: h.id, name: h.name, type: h.type }])
    );

    const shiftByKey = new Map(
      shifts.map(s => [`${s.employeeId}:${formatShiftDate(s.date)}`, s])
    );

    const attendanceByKey = new Map(
      attendance.map(a => [`${a.employeeId}:${dateOnlyJst(a.date)}`, a])
    );

    const rows = employees.map(emp => {
      const days = dates.map(dateStr => {
        const holiday = holidayByDate.get(dateStr) || null;
        const contract = getActiveContractForDate(emp.employeeContracts, dateStr);
        const isContractDay = contract ? isContractWorkDay(contract.workDays, dateStr) : false;
        const shift = shiftByKey.get(`${emp.id}:${dateStr}`);
        const att = attendanceByKey.get(`${emp.id}:${dateStr}`);
        const hasAttendance =
          att && ['PRESENT', 'LATE', 'EARLY_LEAVE'].includes(att.status);

        return {
          date: dateStr,
          holiday,
          isContractWorkDay: isContractDay,
          contractHours: contract
            ? `${(contract as { defaultCheckIn?: string }).defaultCheckIn || '08:00'}–${(contract as { defaultCheckOut?: string }).defaultCheckOut || '17:00'}`
            : null,
          shift: shift
            ? {
                shiftType: shift.shiftType,
                startTime: shift.startTime,
                endTime: shift.endTime,
              }
            : null,
          attendance: att
            ? {
                status: att.status,
                hasCheckIn: !!att.checkIn,
                hasCheckOut: !!att.checkOut,
              }
            : null,
          cellState: holiday
            ? 'holiday'
            : hasAttendance
              ? 'attended'
              : shift?.shiftType === 'off'
                ? 'off'
                : shift
                  ? 'planned'
                  : isContractDay
                    ? 'contract'
                    : 'none',
        };
      });

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        department: emp.department?.name || '',
        days,
      };
    });

    return successResponse({
      month,
      dates,
      holidays: holidays.map(h => ({
        id: h.id,
        date: dateOnlyJst(h.date),
        name: h.name,
        type: h.type,
        isPaidHoliday: h.isPaidHoliday,
      })),
      rows,
      totals: {
        employees: rows.length,
        holidays: holidays.length,
        plannedShifts: shifts.filter(s => s.shiftType !== 'off').length,
        attendanceRecords: attendance.filter(a =>
          ['PRESENT', 'LATE', 'EARLY_LEAVE'].includes(a.status)
        ).length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
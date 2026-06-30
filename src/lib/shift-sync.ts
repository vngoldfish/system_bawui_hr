import type { AttendanceStatus, PrismaClient } from '@prisma/client';
import { computeServerOvertimeHours } from '@/lib/attendance-overtime';
import { getActiveContractForDate } from '@/lib/payroll-helpers';
import { formatShiftDate, getShiftTimes, normalizeShiftType, parseMonthBounds } from '@/lib/shift-helpers';

function parseDateTime(dateStr: string, timeVal: string | null): Date | null {
  if (!timeVal) return null;
  const baseDate = dateStr.split('T')[0];
  const cleanTime = timeVal.length === 5 ? `${timeVal}:00` : timeVal;
  const d = new Date(`${baseDate}T${cleanTime}+09:00`);
  return isNaN(d.getTime()) ? null : d;
}

export async function syncShiftsToAttendance(
  prisma: PrismaClient,
  options: {
    month: string;
    employeeIds?: string[];
    overwriteExisting?: boolean;
  }
): Promise<{ created: number; updated: number; skipped: number; offDays: number }> {
  const { startUtc, endUtc } = parseMonthBounds(options.month);
  const where: { date: { gte: Date; lte: Date }; employeeId?: { in: string[] }; shiftType: { not: string } } = {
    date: { gte: startUtc, lte: endUtc },
    shiftType: { not: 'off' },
  };
  if (options.employeeIds?.length) {
    where.employeeId = { in: options.employeeIds };
  }

  const shifts = await prisma.shiftAssignment.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          employeeContracts: {
            where: { isActive: true },
            select: {
              isActive: true,
              startDate: true,
              endDate: true,
              workDays: true,
              standardHoursPerDay: true,
              holidayWorkCountsAsOvertime: true,
              defaultBreakStart: true,
              defaultBreakEnd: true,
            },
          },
        },
      },
    },
    orderBy: [{ employeeId: 'asc' }, { date: 'asc' }],
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let offDays = 0;

  const offShifts = await prisma.shiftAssignment.count({
    where: {
      date: { gte: startUtc, lte: endUtc },
      shiftType: 'off',
      ...(options.employeeIds?.length ? { employeeId: { in: options.employeeIds } } : {}),
    },
  });
  offDays = offShifts;

  for (const shift of shifts) {
    const dateStr = formatShiftDate(shift.date);
    const shiftType = normalizeShiftType(shift.shiftType);
    if (shiftType === 'off') continue;

    const { startTime, endTime } = getShiftTimes(shiftType);
    const start = shift.startTime || startTime;
    const end = shift.endTime || endTime;

    const contract = getActiveContractForDate(shift.employee.employeeContracts, dateStr) as {
      defaultBreakStart?: string;
      defaultBreakEnd?: string;
    } | null;
    const breakStart = contract?.defaultBreakStart || '12:00';
    const breakEnd = contract?.defaultBreakEnd || '13:00';

    const checkIn = parseDateTime(dateStr, start);
    let checkOut = parseDateTime(dateStr, end);
    if (checkIn && checkOut && checkOut <= checkIn) {
      checkOut = new Date(checkOut.getTime() + 24 * 60 * 60 * 1000);
    }

    const recordDate = new Date(`${dateStr}T00:00:00+09:00`);
    const existing = await prisma.attendanceRecord.findFirst({
      where: {
        employeeId: shift.employeeId,
        date: { gte: recordDate, lte: new Date(`${dateStr}T23:59:59.999+09:00`) },
      },
    });

    if (existing && !options.overwriteExisting) {
      skipped++;
      continue;
    }

    const breakStartDt = parseDateTime(dateStr, breakStart);
    const breakEndDt = parseDateTime(dateStr, breakEnd);
    const status = 'PRESENT' as AttendanceStatus;
    const overtimeHours = await computeServerOvertimeHours(prisma, shift.employeeId, {
      status,
      checkIn,
      checkOut,
      breakStart: breakStartDt,
      breakEnd: breakEndDt,
      date: recordDate,
    });

    const payload = {
      checkIn,
      checkOut,
      breakStart: breakStartDt,
      breakEnd: breakEndDt,
      overtimeHours,
      status,
      notes: shift.notes || `シフト同期 (${shiftType})`,
    };

    if (existing) {
      await prisma.attendanceRecord.update({ where: { id: existing.id }, data: payload });
      updated++;
    } else {
      await prisma.attendanceRecord.create({
        data: {
          employeeId: shift.employeeId,
          date: recordDate,
          ...payload,
        },
      });
      created++;
    }
  }

  return { created, updated, skipped, offDays };
}
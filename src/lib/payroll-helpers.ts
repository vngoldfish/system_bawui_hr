import { calculateRecordWorkHours } from '@/lib/attendance-helpers';
import {
  resolveRecordOvertimeHours,
  type AttendanceOvertimeContext,
} from '@/lib/attendance-overtime';
import { dateOnlyJst } from '@/lib/utils';

export type { AttendanceOvertimeContext } from '@/lib/attendance-overtime';

export function getWorkingMonthDateRange(payrollMonth: string): { start: Date; end: Date } {
  const { startUtc, endUtc } = getPayrollAttendanceRangeJst(payrollMonth);
  return { start: startUtc, end: endUtc };
}

/** JST calendar month YYYY-MM → UTC bounds for DB queries (matches +09:00 attendance storage). */
export function getAttendanceMonthDateRangeJst(calendarMonth: string): { startUtc: Date; endUtc: Date } {
  const [year, month] = calendarMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, '0');
  const dd = String(daysInMonth).padStart(2, '0');
  return {
    startUtc: new Date(`${year}-${mm}-01T00:00:00+09:00`),
    endUtc: new Date(`${year}-${mm}-${dd}T23:59:59.999+09:00`),
  };
}

/** Payroll month → attendance calendar month + JST UTC range. */
export function getPayrollAttendanceRangeJst(payrollMonth: string): {
  calendarMonth: string;
  startUtc: Date;
  endUtc: Date;
} {
  const calendarMonth = getAttendanceMonthForPayroll(payrollMonth);
  const { startUtc, endUtc } = getAttendanceMonthDateRangeJst(calendarMonth);
  return { calendarMonth, startUtc, endUtc };
}

/** Calendar month (YYYY-MM) whose attendance records apply to a payroll month. */
export function getAttendanceMonthForPayroll(payrollMonth: string): string {
  const [year, monthVal] = payrollMonth.split('-').map(Number);
  let y = year;
  let m = monthVal - 1;
  if (m < 1) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

/** Payroll month (YYYY-MM) that includes an attendance date (e.g. May attendance → June payroll). */
export function getPayrollMonthForAttendanceDate(date: Date): string {
  const jstDate = dateOnlyJst(date);
  const [year, month] = jstDate.split('-').map(Number);
  let y = year;
  let m = month + 1;
  if (m > 12) {
    m = 1;
    y += 1;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

const WORK_STATUSES = new Set(['PRESENT', 'LATE', 'EARLY_LEAVE']);

export interface AttendanceRecordForStats {
  status: string;
  date?: Date | string;
  overtimeHours?: number | null;
  checkIn?: Date | string | null;
  checkOut?: Date | string | null;
  breakStart?: Date | string | null;
  breakEnd?: Date | string | null;
}

export function aggregateAttendanceStats(
  records: AttendanceRecordForStats[],
  roundingPolicy = 'exact',
  overtimeContext?: AttendanceOvertimeContext
): { workDays: number; absentDays: number; overtimeHours: number; workHours: number } {
  let workDays = 0;
  let workHours = 0;
  for (const r of records) {
    if (!WORK_STATUSES.has(r.status)) continue;
    const hours = calculateRecordWorkHours(
      r.checkIn ?? null,
      r.checkOut ?? null,
      r.breakStart ?? null,
      r.breakEnd ?? null,
      roundingPolicy
    );
    if (hours > 0) {
      workDays += 1;
      workHours += hours;
    }
  }
  const absentDays = records.filter(a => a.status === 'ABSENT').length;

  let overtimeHours = 0;
  if (overtimeContext?.contracts) {
    for (const r of records) {
      if (!WORK_STATUSES.has(r.status) || !r.date) continue;
      overtimeHours += resolveRecordOvertimeHours(
        { ...r, date: r.date as Date | string },
        overtimeContext,
        roundingPolicy
      );
    }
    overtimeHours = Math.round(overtimeHours * 10) / 10;
  } else {
    overtimeHours = Math.round(
      records.reduce((sum, a) => sum + (a.overtimeHours || 0), 0) * 10
    ) / 10;
  }

  return {
    workDays,
    absentDays,
    overtimeHours,
    workHours: Math.round(workHours * 10) / 10,
  };
}

export function countContractWorkDaysInMonth(workDaysJson: unknown, year: number, month: number): number {
  let workDays = [1, 2, 3, 4, 5];
  if (workDaysJson != null) {
    try {
      workDays = typeof workDaysJson === 'string' ? JSON.parse(workDaysJson) : workDaysJson as number[];
    } catch {
      // Fallback to Mon-Fri
    }
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    if (workDays.includes(date.getDay())) {
      count++;
    }
  }
  return count;
}

export function buildAttendanceLookupKey(employeeId: string, payrollMonth: string): string {
  return `${employeeId}:${payrollMonth}`;
}

export function getActiveContractForDate(
  contracts: Array<{
    isActive: boolean;
    startDate: string | Date;
    endDate?: string | Date | null;
    workDays?: unknown;
    standardHoursPerDay?: number;
    holidayWorkCountsAsOvertime?: boolean;
  }> | undefined,
  dateStr: string
) {
  if (!contracts?.length) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  return (
    contracts.find(contract => {
      if (!contract.isActive) return false;
      const start = new Date(contract.startDate);
      const end = contract.endDate ? new Date(contract.endDate) : null;
      return start <= target && (!end || end >= target);
    }) || contracts.find(c => c.isActive) || null
  );
}
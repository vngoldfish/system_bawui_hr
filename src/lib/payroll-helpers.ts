export function getWorkingMonthDateRange(payrollMonth: string): { start: Date; end: Date } {
  const [year, monthVal] = payrollMonth.split('-').map(Number);
  const start = new Date(year, monthVal - 2, 1);
  const end = new Date(year, monthVal - 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/** Calendar month (YYYY-MM) whose attendance records apply to a payroll month. */
export function getAttendanceMonthForPayroll(payrollMonth: string): string {
  const { start } = getWorkingMonthDateRange(payrollMonth);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
}

/** Payroll month (YYYY-MM) that includes an attendance date (e.g. May attendance → June payroll). */
export function getPayrollMonthForAttendanceDate(date: Date): string {
  const payroll = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return `${payroll.getFullYear()}-${String(payroll.getMonth() + 1).padStart(2, '0')}`;
}

export function aggregateAttendanceStats(
  records: Array<{ status: string; overtimeHours?: number | null }>
): { workDays: number; absentDays: number; overtimeHours: number; workHours: number } {
  const workDays = records.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
  const absentDays = records.filter(a => a.status === 'ABSENT').length;
  const overtimeHours = records.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
  const workHours = workDays * 8;
  return { workDays, absentDays, overtimeHours, workHours };
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
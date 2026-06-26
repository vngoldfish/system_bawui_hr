import { calculateRecordWorkHours } from '@/lib/attendance-helpers';
import { resolveEmployeeWorkLimits } from '@/lib/work-limit';

export interface AttendanceGrossEstimate {
  basePay: number;
  overtimePay: number;
  allowances: number;
  totalGross: number;
  workHours: number;
  workDays: number;
  overtimeHours: number;
}

export interface AttendanceRecordLike {
  date: string | Date;
  checkIn?: string | Date | null;
  checkOut?: string | Date | null;
  breakStart?: string | Date | null;
  breakEnd?: string | Date | null;
  status: string;
  overtimeHours?: number;
}

export function estimateGrossFromAttendance(params: {
  salaryType: string;
  salary: number;
  hourlyRate: number;
  dailyRate: number;
  records: AttendanceRecordLike[];
  roundingPolicy?: string;
  contractWorkDaysInMonth?: number;
  benefits?: { transportation?: number; housing?: number; meal?: number };
  positionAllowance?: number;
}): AttendanceGrossEstimate {
  const policy = params.roundingPolicy || 'exact';
  const presentRecords = params.records.filter(
    r => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'EARLY_LEAVE'
  );

  let workHours = 0;
  let overtimeHours = 0;
  for (const r of presentRecords) {
    workHours += calculateRecordWorkHours(
      r.checkIn ?? null,
      r.checkOut ?? null,
      r.breakStart ?? null,
      r.breakEnd ?? null,
      policy
    );
    overtimeHours += r.overtimeHours ?? 0;
  }
  workHours = Math.round(workHours * 10) / 10;
  overtimeHours = Math.round(overtimeHours * 10) / 10;
  const workDays = presentRecords.length;

  let basePay = 0;
  const { salaryType, salary, hourlyRate, dailyRate } = params;

  if (salaryType === '月給') {
    const contractDays = params.contractWorkDaysInMonth || 22;
    basePay = contractDays > 0 ? Math.round((salary * workDays) / contractDays) : salary;
  } else if (salaryType === '日給') {
    basePay = dailyRate * workDays;
  } else {
    basePay = Math.round(hourlyRate * workHours);
  }

  const hourlyEquiv =
    salaryType === '時給' ? hourlyRate : workHours > 0 ? basePay / workHours : hourlyRate;
  const overtimePay = Math.round(hourlyEquiv * 1.25 * overtimeHours);

  const b = params.benefits || {};
  const allowances =
    (b.transportation || 0) + (b.housing || 0) + (b.meal || 0) + (params.positionAllowance || 0);

  return {
    basePay,
    overtimePay,
    allowances,
    totalGross: basePay + overtimePay + allowances,
    workHours,
    workDays,
    overtimeHours,
  };
}

export interface ProposedAttendanceDay {
  date: string;
  checkIn: string;
  checkOut: string;
  breakStart: string | null;
  breakEnd: string | null;
  hours: number;
}

function dateOnly(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return typeof value === 'string' ? value.split('T')[0] : '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isContractWorkDay(workDays: number[], dateStr: string): boolean {
  const d = new Date(`${dateStr}T00:00:00`);
  return workDays.includes(d.getDay());
}

function addHoursToTime(timeStr: string, hours: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMins = h * 60 + (m || 0) + Math.round(hours * 60);
  const nh = Math.floor(totalMins / 60) % 24;
  const nm = totalMins % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function getWeekKey(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  return dateOnly(monday);
}

export function buildAutoScheduleForMonth(params: {
  employee: {
    salaryType?: string | null;
    hourlyRate?: number | null;
    dailyRate?: number | null;
    workLimitVisa28h?: boolean | null;
    workLimitIncomeCap80k?: boolean | null;
    workLimitWeeklyHours?: number | null;
    workLimitMonthlyIncome?: number | null;
    employeeContracts?: Array<{
      isActive: boolean;
      startDate: string;
      endDate?: string | null;
      workDays: number[];
      standardHoursPerDay?: number;
      defaultCheckIn?: string;
      defaultCheckOut?: string;
      defaultBreakStart?: string;
      defaultBreakEnd?: string;
    }>;
  };
  year: number;
  month: number;
  holidayDates?: Set<string>;
}): { days: ProposedAttendanceDay[]; summary: { totalHours: number; estimatedGross: number; weeklyLimit: number | null; monthlyCap: number | null } } | null {
  const limits = resolveEmployeeWorkLimits(params.employee);
  if (!limits.visa28h && !limits.incomeCap80k) return null;

  const salaryType = params.employee.salaryType || '時給';
  const hourlyRate = params.employee.hourlyRate || 0;
  const dailyRate = params.employee.dailyRate || 0;
  const holidays = params.holidayDates ?? new Set<string>();

  const daysInMonth = new Date(params.year, params.month, 0).getDate();
  const eligibleDates: string[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${params.year}-${String(params.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (holidays.has(dateStr)) continue;

    const contract =
      params.employee.employeeContracts?.find(c => {
        if (!c.isActive) return false;
        const start = new Date(c.startDate);
        const end = c.endDate ? new Date(c.endDate) : null;
        const target = new Date(`${dateStr}T00:00:00`);
        return start <= target && (!end || end >= target);
      }) || params.employee.employeeContracts?.find(c => c.isActive);

    const workDays = contract?.workDays?.length ? contract.workDays : [1, 2, 3, 4, 5];
    if (!isContractWorkDay(workDays, dateStr)) continue;
    eligibleDates.push(dateStr);
  }

  if (eligibleDates.length === 0) {
    return { days: [], summary: { totalHours: 0, estimatedGross: 0, weeklyLimit: limits.weeklyHours, monthlyCap: limits.monthlyIncome } };
  }

  const sampleContract = params.employee.employeeContracts?.find(c => c.isActive);
  const standardHours = sampleContract?.standardHoursPerDay ?? 4;
  const checkInDefault = sampleContract?.defaultCheckIn || '09:00';
  const breakStart = sampleContract?.defaultBreakStart || '12:00';
  const breakEnd = sampleContract?.defaultBreakEnd || '13:00';
  const hasBreak = standardHours > 6;

  let maxMonthHours = Infinity;
  if (limits.incomeCap80k && limits.monthlyIncome != null) {
    if (salaryType === '時給' && hourlyRate > 0) {
      maxMonthHours = Math.floor(limits.monthlyIncome / hourlyRate);
    } else if (salaryType === '日給' && dailyRate > 0) {
      maxMonthHours = Math.floor(limits.monthlyIncome / dailyRate) * standardHours;
    }
  }

  const weeks = new Map<string, string[]>();
  for (const dateStr of eligibleDates) {
    const wk = getWeekKey(dateStr);
    if (!weeks.has(wk)) weeks.set(wk, []);
    weeks.get(wk)!.push(dateStr);
  }

  const proposed: ProposedAttendanceDay[] = [];
  let monthHoursUsed = 0;
  let monthDaysUsed = 0;
  const maxMonthDays =
    limits.incomeCap80k && limits.monthlyIncome != null && salaryType === '日給' && dailyRate > 0
      ? Math.floor(limits.monthlyIncome / dailyRate)
      : Infinity;

  const weekLimit = limits.visa28h && limits.weeklyHours != null ? limits.weeklyHours : Infinity;

  // Round-robin across weeks so hours are spread evenly, not packed into early weeks.
  const weekStates = [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, weekDates]) => ({
      dates: [...weekDates].sort(),
      dateIndex: 0,
      hoursUsed: 0,
    }));

  let madeProgress = true;
  while (madeProgress) {
    madeProgress = false;
    for (const week of weekStates) {
      if (monthHoursUsed >= maxMonthHours) break;
      if (monthDaysUsed >= maxMonthDays) break;
      if (week.hoursUsed >= weekLimit) continue;
      if (week.dateIndex >= week.dates.length) continue;

      const dateStr = week.dates[week.dateIndex++];
      const remainingWeek = weekLimit - week.hoursUsed;
      const remainingMonth = maxMonthHours - monthHoursUsed;
      const dayHours = Math.min(standardHours, remainingWeek, remainingMonth);
      if (dayHours <= 0) continue;

      const checkOutTime = addHoursToTime(checkInDefault, dayHours + (hasBreak ? 1 : 0));
      const checkInIso = `${dateStr}T${checkInDefault}:00`;
      const checkOutIso = `${dateStr}T${checkOutTime}:00`;

      proposed.push({
        date: dateStr,
        checkIn: checkInIso,
        checkOut: checkOutIso,
        breakStart: hasBreak ? `${dateStr}T${breakStart}:00` : null,
        breakEnd: hasBreak ? `${dateStr}T${breakEnd}:00` : null,
        hours: dayHours,
      });

      week.hoursUsed += dayHours;
      monthHoursUsed += dayHours;
      monthDaysUsed += 1;
      madeProgress = true;
    }
  }

  proposed.sort((a, b) => a.date.localeCompare(b.date));

  let estimatedGross = 0;
  if (salaryType === '時給') {
    estimatedGross = Math.round(monthHoursUsed * hourlyRate);
  } else if (salaryType === '日給') {
    estimatedGross = proposed.length * dailyRate;
  }

  return {
    days: proposed,
    summary: {
      totalHours: Math.round(monthHoursUsed * 10) / 10,
      estimatedGross,
      weeklyLimit: limits.weeklyHours,
      monthlyCap: limits.monthlyIncome,
    },
  };
}
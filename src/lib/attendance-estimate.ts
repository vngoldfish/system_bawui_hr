import { calculateRecordWorkHours } from '@/lib/attendance-helpers';
import {
  resolveRecordOvertimeHours,
  type AttendanceOvertimeContext,
} from '@/lib/attendance-overtime';
import { countContractWorkDaysInMonth } from '@/lib/payroll-helpers';
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
  overtimeContext?: AttendanceOvertimeContext;
}): AttendanceGrossEstimate {
  const policy = params.roundingPolicy || 'exact';
  const presentRecords = params.records.filter(
    r => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'EARLY_LEAVE'
  );

  let workHours = 0;
  let workDays = 0;
  let overtimeHours = 0;
  for (const r of presentRecords) {
    const hours = calculateRecordWorkHours(
      r.checkIn ?? null,
      r.checkOut ?? null,
      r.breakStart ?? null,
      r.breakEnd ?? null,
      policy
    );
    if (hours > 0) {
      workDays += 1;
      workHours += hours;
    }
    if (params.overtimeContext?.contracts && r.date) {
      overtimeHours += resolveRecordOvertimeHours(r, params.overtimeContext, policy);
    } else {
      overtimeHours += r.overtimeHours ?? 0;
    }
  }
  workHours = Math.round(workHours * 10) / 10;
  overtimeHours = Math.round(overtimeHours * 10) / 10;

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

export interface ShiftPattern {
  checkIn: string;
  checkOut: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  hasBreak?: boolean;
}

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseShiftPattern(opts: {
  checkIn?: string | null;
  checkOut?: string | null;
  breakStart?: string | null;
  breakEnd?: string | null;
  hasBreak?: boolean | string | null;
}): ShiftPattern | undefined {
  const checkIn = opts.checkIn?.trim();
  const checkOut = opts.checkOut?.trim();
  if (!checkIn || !checkOut || !timePattern.test(checkIn) || !timePattern.test(checkOut)) {
    return undefined;
  }
  if (timeToMinutes(checkOut) <= timeToMinutes(checkIn)) return undefined;

  const hasBreak =
    opts.hasBreak === undefined || opts.hasBreak === null
      ? true
      : opts.hasBreak === true || opts.hasBreak === 'true' || opts.hasBreak === '1';

  const breakStart = opts.breakStart?.trim();
  const breakEnd = opts.breakEnd?.trim();
  if (hasBreak && breakStart && breakEnd && timePattern.test(breakStart) && timePattern.test(breakEnd)) {
    return { checkIn, checkOut, breakStart, breakEnd, hasBreak: true };
  }
  return { checkIn, checkOut, hasBreak: false };
}

function hoursFromShiftPattern(pattern: ShiftPattern, dateStr: string): number {
  const breakStart =
    pattern.hasBreak !== false && pattern.breakStart ? `${dateStr}T${pattern.breakStart}:00` : null;
  const breakEnd =
    pattern.hasBreak !== false && pattern.breakEnd ? `${dateStr}T${pattern.breakEnd}:00` : null;
  return calculateRecordWorkHours(
    `${dateStr}T${pattern.checkIn}:00`,
    `${dateStr}T${pattern.checkOut}:00`,
    breakStart,
    breakEnd,
    'exact'
  );
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

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(totalMins: number): string {
  const nh = Math.floor(totalMins / 60) % 24;
  const nm = totalMins % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function addHoursToTime(timeStr: string, hours: number): string {
  return minutesToTime(timeToMinutes(timeStr) + Math.round(hours * 60));
}

function resolveBreakInWindow(
  windowFrom: string,
  windowTo: string,
  preferredBreakStart: string,
  preferredBreakEnd: string,
  needsBreak: boolean
): { breakStart: string | null; breakEnd: string | null; breakHours: number } {
  if (!needsBreak) {
    return { breakStart: null, breakEnd: null, breakHours: 0 };
  }

  const wf = timeToMinutes(windowFrom);
  const wt = timeToMinutes(windowTo);
  const candidates = [
    [preferredBreakStart, preferredBreakEnd],
    ['12:00', '13:00'],
  ] as const;

  for (const [bs, be] of candidates) {
    const bsm = timeToMinutes(bs);
    const bem = timeToMinutes(be);
    if (bsm >= wf && bem <= wt && bem > bsm) {
      return { breakStart: bs, breakEnd: be, breakHours: (bem - bsm) / 60 };
    }
  }

  return { breakStart: null, breakEnd: null, breakHours: 0 };
}

function getWeekKey(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  return dateOnly(monday);
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

export interface ExistingAttendanceDay {
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  breakStart?: string | null;
  breakEnd?: string | null;
  status: string;
}

function resolveIncomeCapUnits(
  salaryType: string,
  salary: number,
  hourlyRate: number,
  dailyRate: number,
  contractWorkDaysInMonth: number,
  monthlyIncomeCap: number
): { payPerUnit: number; maxUnits: number; unit: 'hours' | 'days' } | null {
  if (salaryType === '時給') {
    if (hourlyRate <= 0) return null;
    return {
      payPerUnit: hourlyRate,
      maxUnits: Math.floor(monthlyIncomeCap / hourlyRate),
      unit: 'hours',
    };
  }
  if (salaryType === '日給') {
    if (dailyRate <= 0) return null;
    return {
      payPerUnit: dailyRate,
      maxUnits: Math.floor(monthlyIncomeCap / dailyRate),
      unit: 'days',
    };
  }
  if (salaryType === '月給') {
    if (salary <= 0 || contractWorkDaysInMonth <= 0) return null;
    const payPerUnit = salary / contractWorkDaysInMonth;
    return {
      payPerUnit,
      maxUnits: Math.floor(monthlyIncomeCap / payPerUnit),
      unit: 'days',
    };
  }
  if (hourlyRate <= 0) return null;
  return {
    payPerUnit: hourlyRate,
    maxUnits: Math.floor(monthlyIncomeCap / hourlyRate),
    unit: 'hours',
  };
}

function missingRateWarning(salaryType: string): string {
  if (salaryType === '日給') {
    return '日給単価が未設定のため、収入上限に基づく自動配置ができません。 (Chưa cấu hình mức lương ngày nên không thể tự động xếp ca theo trần thu nhập.)';
  }
  if (salaryType === '月給') {
    return '月給が未設定のため、収入上限に基づく自動配置ができません。 (Chưa cấu hình lương tháng nên không thể tự động xếp ca theo trần thu nhập.)';
  }
  return '時給が未設定のため、収入上限に基づく自動配置ができません。 (Chưa cấu hình lương giờ nên không thể tự động xếp ca theo trần thu nhập.)';
}

export function buildAutoScheduleForMonth(params: {
  employee: {
    salaryType?: string | null;
    salary?: number | null;
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
  timeWindow?: { from: string; to: string };
  shiftPattern?: ShiftPattern;
  /** Dates that already have attendance — skipped when scheduling new days. */
  occupiedDates?: Set<string>;
  /** Existing records this month — their hours/days count toward limits. */
  existingAttendance?: ExistingAttendanceDay[];
  targetSalary?: number | null;
  targetDays?: number | null;
}): {
  days: ProposedAttendanceDay[];
  summary: {
    totalHours: number;
    estimatedGross: number;
    weeklyLimit: number | null;
    monthlyCap: number | null;
    timeFrom: string;
    timeTo: string;
    warning?: string;
  };
  warning?: string;
} | null {
  const limits = resolveEmployeeWorkLimits(params.employee);
  const hasTargetSalary = params.targetSalary != null && params.targetSalary > 0;
  const hasTargetDays = params.targetDays != null && params.targetDays > 0;
  if (!limits.visa28h && !limits.incomeCap80k && !hasTargetSalary && !hasTargetDays) return null;

  const salaryType = params.employee.salaryType || '時給';
  const salary = params.employee.salary || 0;
  const hourlyRate = params.employee.hourlyRate || 0;
  const dailyRate = params.employee.dailyRate || 0;
  const holidays = params.holidayDates ?? new Set<string>();

  const sampleContract = params.employee.employeeContracts?.find(c => c.isActive);
  const contractCheckIn = sampleContract?.defaultCheckIn || '09:00';

  const makeEmptyResult = (warning?: string, timeFrom = contractCheckIn, timeTo = '22:00') => ({
    days: [] as ProposedAttendanceDay[],
    summary: {
      totalHours: 0,
      estimatedGross: 0,
      weeklyLimit: limits.weeklyHours,
      monthlyCap: (hasTargetSalary ? params.targetSalary : limits.monthlyIncome) ?? null,
      timeFrom,
      timeTo,
      ...(warning ? { warning } : {}),
    },
    ...(warning ? { warning } : {}),
  });

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
    return makeEmptyResult();
  }

  const shiftPattern = params.shiftPattern;
  const patternHours =
    shiftPattern && eligibleDates.length > 0
      ? hoursFromShiftPattern(shiftPattern, eligibleDates[0])
      : 0;
  const useShiftPattern = !!shiftPattern && patternHours > 0;

  const windowFrom = useShiftPattern
    ? shiftPattern!.checkIn
    : params.timeWindow?.from || contractCheckIn;
  const windowTo = useShiftPattern
    ? shiftPattern!.checkOut
    : params.timeWindow?.to || '22:00';

  const standardHours = sampleContract?.standardHoursPerDay ?? 4;
  const contractBreakStart = sampleContract?.defaultBreakStart || '12:00';
  const contractBreakEnd = sampleContract?.defaultBreakEnd || '13:00';
  const contractWorkDaysInMonth = countContractWorkDaysInMonth(
    sampleContract?.workDays ?? [1, 2, 3, 4, 5],
    params.year,
    params.month
  );

  const windowSpanHours = (timeToMinutes(windowTo) - timeToMinutes(windowFrom)) / 60;
  if (windowSpanHours <= 0) {
    return makeEmptyResult();
  }

  const hasIncomeCap = limits.incomeCap80k || hasTargetSalary;
  const monthlyIncomeLimit = hasTargetSalary ? params.targetSalary : limits.monthlyIncome;

  let incomeCapWarning: string | undefined;
  let incomeCapUnits: ReturnType<typeof resolveIncomeCapUnits> = null;
  if (hasIncomeCap && monthlyIncomeLimit != null) {
    incomeCapUnits = resolveIncomeCapUnits(
      salaryType,
      salary,
      hourlyRate,
      dailyRate,
      contractWorkDaysInMonth,
      monthlyIncomeLimit
    );
    if (!incomeCapUnits) {
      incomeCapWarning = missingRateWarning(salaryType);
      if (!limits.visa28h && !hasTargetDays) {
        return makeEmptyResult(incomeCapWarning);
      }
    }
  }

  const useDayBasedScheduling = salaryType === '日給' || incomeCapUnits?.unit === 'days';

  let maxMonthHours = Infinity;
  let maxMonthDays = Infinity;
  if (incomeCapUnits) {
    if (incomeCapUnits.unit === 'hours') {
      maxMonthHours = incomeCapUnits.maxUnits;
    } else {
      maxMonthDays = incomeCapUnits.maxUnits;
    }
  }

  const occupiedDates = params.occupiedDates ?? new Set<string>();
  const availableDates = eligibleDates.filter(d => !occupiedDates.has(d));

  const weeks = new Map<string, string[]>();
  for (const dateStr of availableDates) {
    const wk = getWeekKey(dateStr);
    if (!weeks.has(wk)) weeks.set(wk, []);
    weeks.get(wk)!.push(dateStr);
  }

  const proposed: ProposedAttendanceDay[] = [];
  let monthHoursUsed = 0;
  let monthDaysUsed = 0;
  const weekHoursUsed = new Map<string, number>();

  for (const rec of params.existingAttendance ?? []) {
    const dateStr = dateOnly(rec.date);
    if (!eligibleDates.includes(dateStr)) continue;
    if (rec.status !== 'PRESENT' && rec.status !== 'LATE' && rec.status !== 'EARLY_LEAVE') continue;

    const hours = calculateRecordWorkHours(
      rec.checkIn ?? null,
      rec.checkOut ?? null,
      rec.breakStart ?? null,
      rec.breakEnd ?? null,
      'exact'
    );
    if (hours <= 0) continue;

    monthHoursUsed += hours;
    monthDaysUsed += 1;
    const wk = getWeekKey(dateStr);
    weekHoursUsed.set(wk, (weekHoursUsed.get(wk) ?? 0) + hours);
  }

  const weekLimit = limits.visa28h && limits.weeklyHours != null ? limits.weeklyHours : Infinity;

  const weekStates = [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekKey, weekDates]) => ({
      pool: shuffleArray(weekDates),
      hoursUsed: weekHoursUsed.get(weekKey) ?? 0,
    }));

  const buildDayEntry = (
    dateStr: string,
    remainingWeek: number
  ): ProposedAttendanceDay | null => {
    let dayHours: number;
    let checkInIso: string;
    let checkOutIso: string;
    let breakStartIso: string | null = null;
    let breakEndIso: string | null = null;

    if (useShiftPattern && shiftPattern) {
      dayHours = patternHours;
      if (!useDayBasedScheduling) {
        const remainingMonth = maxMonthHours - monthHoursUsed;
        if (dayHours > remainingMonth) return null;
      }
      if (dayHours > remainingWeek) return null;

      checkInIso = `${dateStr}T${shiftPattern.checkIn}:00`;
      checkOutIso = `${dateStr}T${shiftPattern.checkOut}:00`;
      if (shiftPattern.hasBreak !== false && shiftPattern.breakStart && shiftPattern.breakEnd) {
        breakStartIso = `${dateStr}T${shiftPattern.breakStart}:00`;
        breakEndIso = `${dateStr}T${shiftPattern.breakEnd}:00`;
      }
    } else {
      if (useDayBasedScheduling) {
        dayHours = Math.min(standardHours, remainingWeek);
      } else {
        const remainingMonth = maxMonthHours - monthHoursUsed;
        dayHours = Math.min(standardHours, remainingWeek, remainingMonth);
      }
      if (dayHours <= 0) return null;

      const wantsBreak = dayHours > 6;
      const brk = resolveBreakInWindow(windowFrom, windowTo, contractBreakStart, contractBreakEnd, wantsBreak);
      const maxHoursInWindow = Math.max(0, windowSpanHours - brk.breakHours);
      dayHours = Math.min(dayHours, maxHoursInWindow);
      if (dayHours <= 0) return null;

      const checkOutTime = addHoursToTime(windowFrom, dayHours + brk.breakHours);
      if (timeToMinutes(checkOutTime) > timeToMinutes(windowTo)) return null;

      checkInIso = `${dateStr}T${windowFrom}:00`;
      checkOutIso = `${dateStr}T${checkOutTime}:00`;
      if (brk.breakStart) breakStartIso = `${dateStr}T${brk.breakStart}:00`;
      if (brk.breakEnd) breakEndIso = `${dateStr}T${brk.breakEnd}:00`;
    }

    return {
      date: dateStr,
      checkIn: checkInIso,
      checkOut: checkOutIso,
      breakStart: breakStartIso,
      breakEnd: breakEndIso,
      hours: dayHours,
    };
  };

  // Random spread: pick a random week, then a random day in that week (within limits).
  const targetDaysLimit = hasTargetDays ? params.targetDays! : Infinity;
  let safety = availableDates.length * 4;
  while (safety-- > 0) {
    if (monthHoursUsed >= maxMonthHours || monthDaysUsed >= maxMonthDays || monthDaysUsed >= targetDaysLimit) break;

    const viableWeeks = weekStates.filter(w => w.pool.length > 0 && w.hoursUsed < weekLimit);
    if (viableWeeks.length === 0) break;

    const week = pickRandom(viableWeeks)!;
    const dateIdx = Math.floor(Math.random() * week.pool.length);
    const dateStr = week.pool[dateIdx];
    const remainingWeek = weekLimit - week.hoursUsed;
    const entry = buildDayEntry(dateStr, remainingWeek);

    week.pool.splice(dateIdx, 1);
    if (!entry) continue;

    proposed.push(entry);
    week.hoursUsed += entry.hours;
    monthHoursUsed += entry.hours;
    monthDaysUsed += 1;
  }

  proposed.sort((a, b) => a.date.localeCompare(b.date));

  let estimatedGross = 0;
  if (salaryType === '時給') {
    estimatedGross = Math.round(monthHoursUsed * hourlyRate);
  } else if (salaryType === '日給') {
    estimatedGross = monthDaysUsed * dailyRate;
  } else if (salaryType === '月給') {
    estimatedGross =
      contractWorkDaysInMonth > 0
        ? Math.round((monthDaysUsed * salary) / contractWorkDaysInMonth)
        : 0;
  }

  return {
    days: proposed,
    summary: {
      totalHours: Math.round(monthHoursUsed * 10) / 10,
      estimatedGross,
      weeklyLimit: limits.weeklyHours,
      monthlyCap: (hasTargetSalary ? params.targetSalary : limits.monthlyIncome) ?? null,
      timeFrom: windowFrom,
      timeTo: windowTo,
      ...(incomeCapWarning ? { warning: incomeCapWarning } : {}),
    },
    ...(incomeCapWarning ? { warning: incomeCapWarning } : {}),
  };
}
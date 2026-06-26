export const DEFAULT_VISA_WEEKLY_HOURS = 28;
export const DEFAULT_INCOME_CAP_MONTHLY = 80000;

/** Visa statuses that typically require 週28時間 cap (留学生・家族滞在等). */
export const VISA_STATUSES_28H = ['留学', '家族滞在', '特定活動'] as const;

export interface EmployeeWorkLimits {
  visa28h: boolean;
  incomeCap80k: boolean;
  weeklyHours: number | null;
  monthlyIncome: number | null;
}

export function resolveEmployeeWorkLimits(employee: {
  workLimitVisa28h?: boolean | null;
  workLimitIncomeCap80k?: boolean | null;
  workLimitWeeklyHours?: number | null;
  workLimitMonthlyIncome?: number | null;
}): EmployeeWorkLimits {
  const visa28h = !!employee.workLimitVisa28h;
  const incomeCap80k = !!employee.workLimitIncomeCap80k;
  return {
    visa28h,
    incomeCap80k,
    weeklyHours: visa28h ? (employee.workLimitWeeklyHours ?? DEFAULT_VISA_WEEKLY_HOURS) : null,
    monthlyIncome: incomeCap80k ? (employee.workLimitMonthlyIncome ?? DEFAULT_INCOME_CAP_MONTHLY) : null,
  };
}

export function suggestVisa28hFromStatus(residenceStatus: string | null | undefined): boolean {
  if (!residenceStatus) return false;
  return VISA_STATUSES_28H.some(s => residenceStatus.includes(s));
}

/** Monday 00:00 – Sunday 23:59 (local calendar). */
export function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getWorkedHoursFromRecord(
  record: {
    checkIn?: Date | string | null;
    checkOut?: Date | string | null;
    breakStart?: Date | string | null;
    breakEnd?: Date | string | null;
    status: string;
  },
  fallbackHoursPerDay = 8
): number {
  if (record.status === 'ABSENT' || record.status === 'LEAVE') return 0;

  if (record.checkIn && record.checkOut) {
    const checkIn = new Date(record.checkIn);
    const checkOut = new Date(record.checkOut);
    if (!isNaN(checkIn.getTime()) && !isNaN(checkOut.getTime()) && checkOut > checkIn) {
      let ms = checkOut.getTime() - checkIn.getTime();
      if (record.breakStart && record.breakEnd) {
        const bs = new Date(record.breakStart);
        const be = new Date(record.breakEnd);
        if (!isNaN(bs.getTime()) && !isNaN(be.getTime()) && be > bs) {
          ms -= be.getTime() - bs.getTime();
        }
      }
      return Math.max(0, Math.round((ms / 3600000) * 10) / 10);
    }
  }

  if (record.status === 'PRESENT' || record.status === 'LATE' || record.status === 'EARLY_LEAVE') {
    return fallbackHoursPerDay;
  }
  return 0;
}

export function sumWeeklyWorkedHours(
  records: Array<{
    date: Date | string;
    checkIn?: Date | string | null;
    checkOut?: Date | string | null;
    breakStart?: Date | string | null;
    breakEnd?: Date | string | null;
    status: string;
    id?: string;
  }>,
  weekDate: Date,
  options?: { excludeId?: string; fallbackHoursPerDay?: number }
): number {
  const { start, end } = getWeekRange(weekDate);
  return records
    .filter(r => {
      if (options?.excludeId && r.id === options.excludeId) return false;
      const d = new Date(r.date);
      return d >= start && d <= end;
    })
    .reduce((sum, r) => sum + getWorkedHoursFromRecord(r, options?.fallbackHoursPerDay ?? 8), 0);
}

export function checkWeeklyHourLimit(params: {
  limits: EmployeeWorkLimits;
  records: Array<{
    date: Date | string;
    checkIn?: Date | string | null;
    checkOut?: Date | string | null;
    breakStart?: Date | string | null;
    breakEnd?: Date | string | null;
    status: string;
    id?: string;
  }>;
  targetDate: Date;
  proposedRecord: {
    checkIn?: Date | string | null;
    checkOut?: Date | string | null;
    breakStart?: Date | string | null;
    breakEnd?: Date | string | null;
    status: string;
  };
  excludeId?: string;
  fallbackHoursPerDay?: number;
}): { ok: boolean; totalHours: number; limit: number; message?: string } {
  if (!params.limits.visa28h || params.limits.weeklyHours == null) {
    return { ok: true, totalHours: 0, limit: 0 };
  }

  const existing = sumWeeklyWorkedHours(params.records, params.targetDate, {
    excludeId: params.excludeId,
    fallbackHoursPerDay: params.fallbackHoursPerDay,
  });
  const proposed = getWorkedHoursFromRecord(params.proposedRecord, params.fallbackHoursPerDay ?? 8);
  const totalHours = Math.round((existing + proposed) * 10) / 10;
  const limit = params.limits.weeklyHours;

  if (totalHours > limit) {
    return {
      ok: false,
      totalHours,
      limit,
      message: `週間労働時間が上限（${limit}時間）を超えます（${totalHours}時間）。留学生・家族滞在等の就労制限にご注意ください。 (Vượt giới hạn ${limit}h/tuần: ${totalHours}h)`,
    };
  }

  return { ok: true, totalHours, limit };
}

export function checkMonthlyIncomeCap(params: {
  limits: EmployeeWorkLimits;
  currentMonthGross: number;
  additionalGross?: number;
}): { ok: boolean; total: number; limit: number; message?: string } {
  if (!params.limits.incomeCap80k || params.limits.monthlyIncome == null) {
    return { ok: true, total: 0, limit: 0 };
  }

  const total = params.currentMonthGross + (params.additionalGross ?? 0);
  const limit = params.limits.monthlyIncome;

  if (total > limit) {
    return {
      ok: false,
      total,
      limit,
      message: `月収が上限（¥${limit.toLocaleString('ja-JP')}）を超えます（¥${total.toLocaleString('ja-JP')}）。被扶養者（扶養控除）の維持にご注意ください。 (Vượt trần ¥${limit.toLocaleString('ja-JP')}/tháng)`,
    };
  }

  return { ok: true, total, limit };
}
import type { ShiftType } from '@/lib/shift-helpers';

export type ShiftPreference = ShiftType | 'any';

export function getNextMonthStr(from = new Date()): string {
  const next = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
}

/** Same calendar day mapped into a target YYYY-MM month (clamped to month length). */
export function mapDayToMonth(sourceDate: string, targetMonth: string): string {
  const day = Number(sourceDate.split('-')[2]);
  const [year, monthNum] = targetMonth.split('-').map(Number);
  const lastDay = new Date(year, monthNum, 0).getDate();
  const d = Math.min(day, lastDay);
  return `${targetMonth}-${String(d).padStart(2, '0')}`;
}

export function findBestWorkRegistrationDate(
  byDate: Record<string, Array<{ shiftPreference: string }>>,
  preferredMonth: string,
  preferredDate?: string
): string | null {
  if (preferredDate && (byDate[preferredDate] || []).some(r => r.shiftPreference !== 'off')) {
    return preferredDate;
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [date, rows] of Object.entries(byDate)) {
    if (!date.startsWith(preferredMonth)) continue;
    const count = rows.filter(r => r.shiftPreference !== 'off').length;
    if (count > bestCount) {
      bestCount = count;
      best = date;
    }
  }
  return best;
}

export function getMonthDays(month: string): string[] {
  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return `${month}-${String(d).padStart(2, '0')}`;
  });
}

export function isShiftRegistrationEligible(_category?: string | null, _contractTypeName?: string | null): boolean {
  return true;
}

export function toAvailabilityDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function normalizeShiftPreference(value?: string | null): ShiftPreference {
  const v = (value || 'any').toLowerCase();
  if (['day', 'night', 'early', 'late', 'off', 'any'].includes(v)) return v as ShiftPreference;
  return 'any';
}
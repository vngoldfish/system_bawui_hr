import { dateOnlyJst } from '@/lib/utils';
import { isContractWorkDay } from '@/lib/attendance-helpers';
import { getActiveContractForDate } from '@/lib/payroll-helpers';

export type ShiftType = 'day' | 'night' | 'early' | 'late' | 'off';

export const SHIFT_TYPE_PRESETS: Record<
  ShiftType,
  { startTime: string; endTime: string; label: string; icon: string }
> = {
  day: { startTime: '09:00', endTime: '18:00', label: '日勤', icon: '☀️' },
  night: { startTime: '22:00', endTime: '07:00', label: '夜勤', icon: '🌙' },
  early: { startTime: '06:00', endTime: '15:00', label: '早番', icon: '🌅' },
  late: { startTime: '13:00', endTime: '22:00', label: '遅番', icon: '🌆' },
  off: { startTime: '', endTime: '', label: '休み', icon: '🔴' },
};

/** Map employee registration preference to shift assignment type */
export function preferenceToShiftType(preference?: string | null): ShiftType {
  const v = (preference || 'any').toLowerCase();
  if (v === 'off') return 'off';
  if (['day', 'night', 'early', 'late'].includes(v)) return v as ShiftType;
  return 'day';
}

export function isWorkRegistration(preference?: string | null): boolean {
  return (preference || 'any').toLowerCase() !== 'off';
}

export function normalizeShiftType(value?: string | null): ShiftType {
  const v = (value || 'day').toLowerCase();
  if (['day', 'night', 'early', 'late', 'off'].includes(v)) return v as ShiftType;
  return 'day';
}

export function getShiftTimes(shiftType: ShiftType): { startTime: string; endTime: string } {
  const preset = SHIFT_TYPE_PRESETS[shiftType];
  return { startTime: preset.startTime, endTime: preset.endTime };
}

export function parseMonthBounds(month: string): { startUtc: Date; endUtc: Date; year: number; monthNum: number } {
  const [year, monthNum] = month.split('-').map(Number);
  const startUtc = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
  const endUtc = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));
  return { startUtc, endUtc, year, monthNum };
}

export function buildJstDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh - 9, mm || 0, 0, 0));
}

export function isEmployeeContractWorkDay(
  contracts: Parameters<typeof getActiveContractForDate>[0],
  dateStr: string
): boolean {
  const contract = getActiveContractForDate(contracts, dateStr);
  if (!contract) return false;
  return isContractWorkDay(contract.workDays, dateStr);
}

export function formatShiftDate(date: Date | string): string {
  return dateOnlyJst(typeof date === 'string' ? date : date.toISOString());
}

export const JP_NATIONAL_HOLIDAYS_2026: Array<{ date: string; name: string }> = [
  { date: '2026-01-01', name: '元日' },
  { date: '2026-01-12', name: '成人の日' },
  { date: '2026-02-11', name: '建国記念の日' },
  { date: '2026-02-23', name: '天皇誕生日' },
  { date: '2026-03-20', name: '春分の日' },
  { date: '2026-04-29', name: '昭和の日' },
  { date: '2026-05-03', name: '憲法記念日' },
  { date: '2026-05-04', name: 'みどりの日' },
  { date: '2026-05-05', name: 'こどもの日' },
  { date: '2026-05-06', name: '振替休日' },
  { date: '2026-07-20', name: '海の日' },
  { date: '2026-08-11', name: '山の日' },
  { date: '2026-09-21', name: '敬老の日' },
  { date: '2026-09-22', name: '秋分の日' },
  { date: '2026-09-23', name: '振替休日' },
  { date: '2026-10-12', name: 'スポーツの日' },
  { date: '2026-11-03', name: '文化の日' },
  { date: '2026-11-23', name: '勤労感謝の日' },
];
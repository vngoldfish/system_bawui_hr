import type { ShiftType } from '@/lib/shift-helpers';
import type { ShiftRegistrationPolicy } from '@/lib/shift-registration-policy';

export const DEFAULT_ENABLED_SHIFT_TYPES = 'day,early,late,night';

export const SHIFT_TYPE_OPTIONS: Array<{ key: ShiftType; label: string; icon: string }> = [
  { key: 'day', label: '日勤', icon: '☀️' },
  { key: 'early', label: '早番', icon: '🌅' },
  { key: 'late', label: '遅番', icon: '🌆' },
  { key: 'night', label: '夜勤', icon: '🌙' },
];

export function parseEnabledShiftTypes(raw?: string | null): ShiftType[] {
  const allowed = new Set(['day', 'early', 'late', 'night']);
  if (!raw?.trim()) return ['day', 'early', 'late', 'night'];
  const parsed = raw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter((s): s is ShiftType => allowed.has(s));
  return parsed.length > 0 ? parsed : ['day', 'early', 'late', 'night'];
}

export function serializeEnabledShiftTypes(types: ShiftType[]): string {
  const allowed = new Set(['day', 'early', 'late', 'night']);
  const valid = types.filter(t => allowed.has(t));
  return valid.length > 0 ? valid.join(',') : DEFAULT_ENABLED_SHIFT_TYPES;
}

export interface ShiftCompanySettings {
  shiftRegistrationRequired: boolean;
  shiftRegistrationDeadlineDay: number;
  shiftRegistrationPolicy: ShiftRegistrationPolicy;
  enabledShiftTypes: ShiftType[];
}
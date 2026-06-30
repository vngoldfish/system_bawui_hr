import { prisma } from '@/lib/prisma';
import {
  DEFAULT_ENABLED_SHIFT_TYPES,
  parseEnabledShiftTypes,
  type ShiftCompanySettings,
} from '@/lib/shift-company-settings';
import { parseShiftRegistrationPolicy } from '@/lib/shift-registration-policy';

async function readShiftCompanyRow(): Promise<{
  shiftRegistrationRequired: boolean | null;
  shiftRegistrationDeadlineDay: number | null;
  shiftRegistrationPolicyRules: unknown;
  enabledShiftTypes: string | null;
} | null> {
  const rows = await prisma.$queryRaw<
    Array<{
      shiftRegistrationRequired: boolean | null;
      shiftRegistrationDeadlineDay: number | null;
      shiftRegistrationPolicyRules: unknown;
      enabledShiftTypes: string | null;
    }>
  >`
    SELECT "shiftRegistrationRequired", "shiftRegistrationDeadlineDay",
           "shiftRegistrationPolicyRules", "enabledShiftTypes"
    FROM "companies"
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getShiftCompanySettings(): Promise<ShiftCompanySettings> {
  try {
    const row = await readShiftCompanyRow();
    const deadlineDay = Number(row?.shiftRegistrationDeadlineDay ?? 25) || 25;
    return {
      shiftRegistrationRequired: row?.shiftRegistrationRequired !== false,
      shiftRegistrationDeadlineDay: deadlineDay,
      shiftRegistrationPolicy: parseShiftRegistrationPolicy(
        row?.shiftRegistrationPolicyRules,
        deadlineDay
      ),
      enabledShiftTypes: parseEnabledShiftTypes(row?.enabledShiftTypes),
    };
  } catch {
    return {
      shiftRegistrationRequired: true,
      shiftRegistrationDeadlineDay: 25,
      shiftRegistrationPolicy: parseShiftRegistrationPolicy(null, 25),
      enabledShiftTypes: parseEnabledShiftTypes(DEFAULT_ENABLED_SHIFT_TYPES),
    };
  }
}

export async function readEnabledShiftTypesRaw(): Promise<string | null> {
  try {
    const row = await readShiftCompanyRow();
    return row?.enabledShiftTypes ?? null;
  } catch {
    return null;
  }
}

export async function readShiftRegistrationRequiredRaw(): Promise<boolean> {
  try {
    const row = await readShiftCompanyRow();
    return row?.shiftRegistrationRequired !== false;
  } catch {
    return true;
  }
}
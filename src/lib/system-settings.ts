import { prisma } from '@/lib/prisma';

import { parseEnabledShiftTypes } from '@/lib/shift-company-settings';
import type { ShiftType } from '@/lib/shift-helpers';
import {
  parseShiftRegistrationPolicy,
  type ShiftRegistrationPolicy,
} from '@/lib/shift-registration-policy';

export interface AttendanceSystemSettings {
  attendanceAutoScheduleEnabled: boolean;
  attendanceGrossEstimateEnabled: boolean;
  shiftRegistrationRequired: boolean;
  shiftRegistrationDeadlineDay: number;
  shiftRegistrationPolicy: ShiftRegistrationPolicy;
  enabledShiftTypes: ShiftType[];
  incomeTaxThreshold: number;
}

const defaultSettings: AttendanceSystemSettings = {
  attendanceAutoScheduleEnabled: true,
  attendanceGrossEstimateEnabled: true,
  shiftRegistrationRequired: true,
  shiftRegistrationDeadlineDay: 25,
  shiftRegistrationPolicy: parseShiftRegistrationPolicy(null, 25),
  enabledShiftTypes: parseEnabledShiftTypes(null),
  incomeTaxThreshold: 88000,
};

function mapCompanyToSettings(company: Record<string, unknown> | null): AttendanceSystemSettings {
  if (!company) return defaultSettings;
  const deadlineDay = Number(company.shiftRegistrationDeadlineDay ?? 25) || 25;
  return {
    attendanceAutoScheduleEnabled: company.attendanceAutoScheduleEnabled !== false,
    attendanceGrossEstimateEnabled: company.attendanceGrossEstimateEnabled !== false,
    shiftRegistrationRequired: company.shiftRegistrationRequired !== false,
    shiftRegistrationDeadlineDay: deadlineDay,
    shiftRegistrationPolicy: parseShiftRegistrationPolicy(
      company.shiftRegistrationPolicyRules,
      deadlineDay
    ),
    enabledShiftTypes: parseEnabledShiftTypes(company.enabledShiftTypes as string | null),
    incomeTaxThreshold: Number(company.incomeTaxThreshold ?? 88000),
  };
}

export async function getAttendanceSystemSettings(): Promise<AttendanceSystemSettings> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        attendanceAutoScheduleEnabled: boolean | null;
        attendanceGrossEstimateEnabled: boolean | null;
        shiftRegistrationRequired: boolean | null;
        shiftRegistrationDeadlineDay: number | null;
        shiftRegistrationPolicyRules: unknown;
        enabledShiftTypes: string | null;
        incomeTaxThreshold: number | null;
      }>
    >`
      SELECT "attendanceAutoScheduleEnabled", "attendanceGrossEstimateEnabled",
             "shiftRegistrationRequired", "shiftRegistrationDeadlineDay",
             "shiftRegistrationPolicyRules", "enabledShiftTypes", "incomeTaxThreshold"
      FROM "companies"
      LIMIT 1
    `;
    return mapCompanyToSettings(rows[0] ?? null);
  } catch {
    const company = await prisma.company.findFirst();
    return mapCompanyToSettings((company as Record<string, unknown> | null) ?? null);
  }
}

export async function isAttendanceAutoScheduleEnabled(): Promise<boolean> {
  const settings = await getAttendanceSystemSettings();
  return settings.attendanceAutoScheduleEnabled;
}

export async function isAttendanceGrossEstimateEnabled(): Promise<boolean> {
  const settings = await getAttendanceSystemSettings();
  return settings.attendanceGrossEstimateEnabled;
}
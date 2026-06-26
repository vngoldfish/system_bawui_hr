import { prisma } from '@/lib/prisma';

export interface AttendanceSystemSettings {
  attendanceAutoScheduleEnabled: boolean;
  attendanceGrossEstimateEnabled: boolean;
}

const defaultSettings: AttendanceSystemSettings = {
  attendanceAutoScheduleEnabled: true,
  attendanceGrossEstimateEnabled: true,
};

export async function getAttendanceSystemSettings(): Promise<AttendanceSystemSettings> {
  const company = await prisma.company.findFirst({
    select: {
      attendanceAutoScheduleEnabled: true,
      attendanceGrossEstimateEnabled: true,
    },
  });
  if (!company) return defaultSettings;
  return {
    attendanceAutoScheduleEnabled: company.attendanceAutoScheduleEnabled ?? true,
    attendanceGrossEstimateEnabled: company.attendanceGrossEstimateEnabled ?? true,
  };
}

export async function isAttendanceAutoScheduleEnabled(): Promise<boolean> {
  const settings = await getAttendanceSystemSettings();
  return settings.attendanceAutoScheduleEnabled;
}

export async function isAttendanceGrossEstimateEnabled(): Promise<boolean> {
  const settings = await getAttendanceSystemSettings();
  return settings.attendanceGrossEstimateEnabled;
}
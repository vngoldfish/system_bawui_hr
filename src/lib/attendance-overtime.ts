import { calculateContractAwareOvertime } from '@/lib/attendance-helpers';
import { getActiveContractForDate } from '@/lib/payroll-helpers';
import { dateOnlyJst } from '@/lib/utils';

const WORK_STATUSES = new Set(['PRESENT', 'LATE', 'EARLY_LEAVE']);

export type OvertimeContractInfo = {
  isActive: boolean;
  startDate: string | Date;
  endDate?: string | Date | null;
  workDays?: unknown;
  standardHoursPerDay?: number;
  holidayWorkCountsAsOvertime?: boolean;
};

export type OvertimeHolidayInfo = {
  date: string | Date;
  isActive: boolean;
};

export type AttendanceOvertimeContext = {
  contracts?: OvertimeContractInfo[];
  holidays?: OvertimeHolidayInfo[];
};

export function resolveRecordOvertimeHours(
  record: {
    status: string;
    checkIn?: Date | string | null;
    checkOut?: Date | string | null;
    breakStart?: Date | string | null;
    breakEnd?: Date | string | null;
    date: Date | string;
  },
  context: AttendanceOvertimeContext,
  roundingPolicy: string
): number {
  if (!WORK_STATUSES.has(record.status)) return 0;
  if (!record.checkIn || !record.checkOut) return 0;

  const dateStr = dateOnlyJst(record.date);
  const contract = getActiveContractForDate(context.contracts, dateStr);
  const holiday =
    context.holidays?.find(h => h.isActive && dateOnlyJst(h.date) === dateStr) ?? null;

  const otContract = contract
    ? {
        workDays: contract.workDays,
        standardHoursPerDay: contract.standardHoursPerDay ?? 8,
        holidayWorkCountsAsOvertime: contract.holidayWorkCountsAsOvertime ?? true,
      }
    : null;

  return calculateContractAwareOvertime(
    {
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      breakStart: record.breakStart ?? null,
      breakEnd: record.breakEnd ?? null,
      date: record.date,
    },
    otContract,
    holiday,
    roundingPolicy
  );
}

export async function fetchAttendanceOvertimeContext(
  prisma: {
    company: { findFirst: (args: any) => Promise<{ roundingPolicy?: string | null } | null> };
    employee: {
      findUnique: (args: any) => Promise<{
        employeeContracts: OvertimeContractInfo[];
      } | null>;
    };
    holiday: { findMany: (args: any) => Promise<Array<{ date: Date; isActive: boolean }>> };
  },
  employeeId: string,
  recordDate: Date
): Promise<{ context: AttendanceOvertimeContext; roundingPolicy: string }> {
  const dateStr = dateOnlyJst(recordDate);
  const dayStart = new Date(`${dateStr}T00:00:00+09:00`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999+09:00`);

  const [company, employee, holidays] = await Promise.all([
    prisma.company.findFirst({ select: { roundingPolicy: true } }),
    prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        employeeContracts: {
          where: { isActive: true },
          select: {
            isActive: true,
            startDate: true,
            endDate: true,
            workDays: true,
            standardHoursPerDay: true,
            holidayWorkCountsAsOvertime: true,
          },
        },
      },
    }),
    prisma.holiday.findMany({
      where: {
        isActive: true,
        date: { gte: dayStart, lte: dayEnd },
      },
    }),
  ]);

  return {
    roundingPolicy: company?.roundingPolicy || 'exact',
    context: {
      contracts: employee?.employeeContracts ?? [],
      holidays: holidays.map(h => ({ date: h.date, isActive: h.isActive })),
    },
  };
}

export async function computeServerOvertimeHours(
  prisma: any,
  employeeId: string,
  record: {
    status: string;
    checkIn: Date | null;
    checkOut: Date | null;
    breakStart: Date | null;
    breakEnd: Date | null;
    date: Date;
  }
): Promise<number> {
  const { context, roundingPolicy } = await fetchAttendanceOvertimeContext(
    prisma,
    employeeId,
    record.date
  );
  return Math.round(
    resolveRecordOvertimeHours(record, context, roundingPolicy) * 10
  ) / 10;
}
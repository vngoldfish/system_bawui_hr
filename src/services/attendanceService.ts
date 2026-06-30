import { prisma } from '@/lib/prisma';
import { getAttendanceMonthDateRangeJst } from '@/lib/payroll-helpers';
import { serializeEmployee } from './employeeService';

const attendanceEmployeeInclude = {
  department: true,
  position: true,
  contractType: true,
  employeeContracts: {
    include: { contractType: true },
    orderBy: { startDate: 'desc' as const },
  },
};

function buildDateFilter(options?: { month?: string; monthsBack?: number }) {
  if (options?.month) {
    const { startUtc, endUtc } = getAttendanceMonthDateRangeJst(options.month);
    return { gte: startUtc, lte: endUtc };
  }

  if (options?.monthsBack) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - options.monthsBack + 1, 1);
    return { gte: startDate };
  }

  return undefined;
}

function serializeAttendanceRecord(rec: any) {
  return {
    ...rec,
    date: rec.date.toISOString(),
    checkIn: rec.checkIn?.toISOString() ?? null,
    checkOut: rec.checkOut?.toISOString() ?? null,
    breakStart: rec.breakStart?.toISOString() ?? null,
    breakEnd: rec.breakEnd?.toISOString() ?? null,
    createdAt: rec.createdAt.toISOString(),
    updatedAt: rec.updatedAt.toISOString(),
    employee: serializeEmployee(rec.employee),
  };
}

export const attendanceService = {
  async getHolidays() {
    const holidays = await prisma.holiday.findMany({
      where: { isActive: true },
      orderBy: { date: 'asc' },
    });
    return holidays.map(h => ({
      ...h,
      date: h.date.toISOString(),
      createdAt: h.createdAt.toISOString(),
      updatedAt: h.updatedAt.toISOString(),
    }));
  },

  async getAttendanceRecords(options?: { month?: string; monthsBack?: number; employeeId?: string }) {
    const where: { employeeId?: string; date?: { gte: Date; lte?: Date } } = {};

    if (options?.employeeId) {
      where.employeeId = options.employeeId;
    }

    const dateFilter = buildDateFilter(options);
    if (dateFilter) {
      where.date = dateFilter;
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: {
          include: attendanceEmployeeInclude,
        },
      },
      orderBy: { date: 'desc' },
    });

    return records.map(serializeAttendanceRecord);
  },

  async getAttendanceRecordsByMonth(month: string) {
    return this.getAttendanceRecords({ month });
  },

  async getAttendanceRecordsByEmployeeId(employeeId: string, options?: { monthsBack?: number }) {
    const where: { employeeId: string; date?: { gte: Date } } = { employeeId };

    const dateFilter = buildDateFilter(options);
    if (dateFilter) {
      where.date = dateFilter;
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: {
          include: attendanceEmployeeInclude,
        },
      },
      orderBy: { date: 'desc' },
    });

    return records.map(serializeAttendanceRecord);
  },
};
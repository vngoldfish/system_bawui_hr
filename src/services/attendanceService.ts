import { prisma } from '@/lib/prisma';
import { serializeEmployee } from './employeeService';

// Optimized minimal include for attendance logs
const attendanceEmployeeInclude = {
  department: true,
  position: true,
  contractType: true,
  employeeContracts: {
    include: { contractType: true },
    orderBy: { startDate: 'desc' as const },
  },
};

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

  async getAttendanceRecords() {
    const records = await prisma.attendanceRecord.findMany({
      include: {
        employee: {
          include: attendanceEmployeeInclude,
        },
      },
      orderBy: { date: 'desc' },
    });
    return records.map(rec => ({
      ...rec,
      date: rec.date.toISOString(),
      checkIn: rec.checkIn?.toISOString() ?? null,
      checkOut: rec.checkOut?.toISOString() ?? null,
      breakStart: rec.breakStart?.toISOString() ?? null,
      breakEnd: rec.breakEnd?.toISOString() ?? null,
      createdAt: rec.createdAt.toISOString(),
      updatedAt: rec.updatedAt.toISOString(),
      employee: serializeEmployee(rec.employee),
    }));
  },

  async getAttendanceRecordsByEmployeeId(employeeId: string) {
    const records = await prisma.attendanceRecord.findMany({
      where: { employeeId },
      include: {
        employee: {
          include: attendanceEmployeeInclude,
        },
      },
      orderBy: { date: 'desc' },
    });
    return records.map(rec => ({
      ...rec,
      date: rec.date.toISOString(),
      checkIn: rec.checkIn?.toISOString() ?? null,
      checkOut: rec.checkOut?.toISOString() ?? null,
      breakStart: rec.breakStart?.toISOString() ?? null,
      breakEnd: rec.breakEnd?.toISOString() ?? null,
      createdAt: rec.createdAt.toISOString(),
      updatedAt: rec.updatedAt.toISOString(),
      employee: serializeEmployee(rec.employee),
    }));
  }
};

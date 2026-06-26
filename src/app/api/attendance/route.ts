import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createdResponse, errorResponse, handleApiError, successResponse } from '@/lib/api-utils';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';
import { getPayrollMonthForAttendanceDate } from '@/lib/payroll-helpers';
import {
  checkWeeklyHourLimit,
  getWeekRange,
  getWorkedHoursFromRecord,
  resolveEmployeeWorkLimits,
} from '@/lib/work-limit';

// GET attendance records
export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date');
    const month = searchParams.get('month');

    const where: any = {};

    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const isEmployeeMode = user.role === 'EMPLOYEE' || viewMode === 'employee';
    if (isEmployeeMode) {
      where.employeeId = user.id;
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    if (date) {
      where.date = {
        gte: new Date(date),
        lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
      };
    }

    if (month) {
      const [year, monthNum] = month.split('-');
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 1);
      where.date = {
        gte: startDate,
        lt: endDate,
      };
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: true,
      },
      orderBy: { date: 'desc' },
    });

    return successResponse(records);
  } catch (error) {
    return handleApiError(error);
  }
}

async function assertAttendanceWithinWorkLimits(
  employeeId: string,
  recordDate: Date,
  proposed: {
    checkIn: Date | null;
    checkOut: Date | null;
    breakStart: Date | null;
    breakEnd: Date | null;
    status: string;
  },
  excludeId?: string
) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      workLimitVisa28h: true,
      workLimitIncomeCap80k: true,
      workLimitWeeklyHours: true,
      workLimitMonthlyIncome: true,
      employeeContracts: {
        where: { isActive: true },
        take: 1,
        select: { standardHoursPerDay: true },
      },
    },
  });
  if (!employee) return;

  const limits = resolveEmployeeWorkLimits(employee);
  if (!limits.visa28h) return;

  const { start, end } = getWeekRange(recordDate);
  const weekRecords = await prisma.attendanceRecord.findMany({
    where: { employeeId, date: { gte: start, lte: end } },
    select: {
      id: true,
      date: true,
      checkIn: true,
      checkOut: true,
      breakStart: true,
      breakEnd: true,
      status: true,
    },
  });

  const fallbackHours = employee.employeeContracts[0]?.standardHoursPerDay ?? 8;
  const check = checkWeeklyHourLimit({
    limits,
    records: weekRecords,
    targetDate: recordDate,
    proposedRecord: proposed,
    excludeId,
    fallbackHoursPerDay: fallbackHours,
  });

  if (!check.ok) {
    throw new Error(check.message || '週間労働時間の上限を超えています。');
  }
}

// Helper to parse date and time safely
function parseDateTime(dateStr: string, timeVal: string | null) {
  if (!timeVal) return null;
  // If timeVal already contains full datetime (like YYYY-MM-DDTHH:MM...)
  if (timeVal.includes('T') || timeVal.includes('-')) {
    const hasOffset = timeVal.endsWith('Z') || timeVal.includes('+') || (timeVal.includes('T') && timeVal.split('T')[1].includes('-'));
    const d = new Date(hasOffset ? timeVal : `${timeVal}+09:00`);
    if (!isNaN(d.getTime())) return d;
  }
  const baseDate = dateStr.split('T')[0];
  const cleanTime = timeVal.length === 5 ? `${timeVal}:00` : timeVal;
  const d = new Date(`${baseDate}T${cleanTime}+09:00`);
  return isNaN(d.getTime()) ? null : d;
}


// POST new attendance record
export async function POST(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const isEmployeeMode = user.role === 'EMPLOYEE' || viewMode === 'employee';
    if (isEmployeeMode) {
      return errorResponse('Forbidden', 403);
    }

    const data = await request.json();

    // Check if payroll is locked for this month
    const recordDate = new Date(data.date);
    if (!isNaN(recordDate.getTime())) {
      const payrollMonth = getPayrollMonthForAttendanceDate(recordDate);
      const payrollRecord = await prisma.payrollRecord.findFirst({
        where: {
          employeeId: data.employeeId,
          month: payrollMonth,
          status: {
            in: ['APPROVED', 'PAID']
          }
        }
      });
      if (payrollRecord) {
        return errorResponse(`給与 ${payrollMonth} が確定済みのため、勤怠データを変更できません。未確定に戻してから編集してください。 (Bảng lương ${payrollMonth} đã chốt — hủy chốt trước khi sửa chấm công.)`, 400);
      }

      const proposed = {
        checkIn: parseDateTime(data.date, data.checkIn),
        checkOut: parseDateTime(data.date, data.checkOut),
        breakStart: parseDateTime(data.date, data.breakStart),
        breakEnd: parseDateTime(data.date, data.breakEnd),
        status: data.status || 'PRESENT',
      };
      try {
        await assertAttendanceWithinWorkLimits(data.employeeId, recordDate, proposed);
      } catch (limitErr: unknown) {
        const msg = limitErr instanceof Error ? limitErr.message : '週間労働時間の上限を超えています。';
        return errorResponse(msg, 400);
      }
    }

    const record = await prisma.attendanceRecord.create({
      data: {
        employeeId: data.employeeId,
        date: new Date(data.date),
        checkIn: parseDateTime(data.date, data.checkIn),
        checkOut: parseDateTime(data.date, data.checkOut),
        breakStart: parseDateTime(data.date, data.breakStart),
        breakEnd: parseDateTime(data.date, data.breakEnd),
        overtimeHours: parseFloat(data.overtimeHours) || 0,
        notes: data.notes || '',
        status: data.status || 'PRESENT',
      },
      include: {
        employee: {
          include: {
            department: true,
            position: true,
          },
        },
      },
    });

    logDatabaseChange({
      request,
      action: 'CREATE',
      model: 'AttendanceRecord',
      recordId: record.id,
      details: {
        employeeId: record.employeeId,
        date: record.date,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        status: record.status,
      },
    });

    return createdResponse(record);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT update attendance record
export async function PUT(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const isEmployeeMode = user.role === 'EMPLOYEE' || viewMode === 'employee';
    if (isEmployeeMode) {
      return errorResponse('Forbidden', 403);
    }

    const data = await request.json();

    if (!data.id) {
      return errorResponse('Record ID is required', 400);
    }

    // Get current attendance record to determine employeeId and month
    const currentRecord = await prisma.attendanceRecord.findUnique({
      where: { id: data.id }
    });
    if (!currentRecord) {
      return errorResponse('Attendance record not found', 404);
    }

    const recordDate = new Date(currentRecord.date);
    const payrollMonth = getPayrollMonthForAttendanceDate(recordDate);
    const payrollRecord = await prisma.payrollRecord.findFirst({
      where: {
        employeeId: currentRecord.employeeId,
        month: payrollMonth,
        status: {
          in: ['APPROVED', 'PAID']
        }
      }
    });
    if (payrollRecord) {
      return errorResponse(`給与 ${payrollMonth} が確定済みのため、勤怠データを変更できません。未確定に戻してから編集してください。 (Bảng lương ${payrollMonth} đã chốt — hủy chốt trước khi sửa chấm công.)`, 400);
    }

    const proposedUpdate = {
      checkIn: parseDateTime(data.date, data.checkIn),
      checkOut: parseDateTime(data.date, data.checkOut),
      breakStart: parseDateTime(data.date, data.breakStart),
      breakEnd: parseDateTime(data.date, data.breakEnd),
      status: data.status || 'PRESENT',
    };
    try {
      await assertAttendanceWithinWorkLimits(currentRecord.employeeId, recordDate, proposedUpdate, data.id);
    } catch (limitErr: unknown) {
      const msg = limitErr instanceof Error ? limitErr.message : '週間労働時間の上限を超えています。';
      return errorResponse(msg, 400);
    }

    const record = await prisma.attendanceRecord.update({
      where: { id: data.id },
      data: {
        checkIn: parseDateTime(data.date, data.checkIn),
        checkOut: parseDateTime(data.date, data.checkOut),
        breakStart: parseDateTime(data.date, data.breakStart),
        breakEnd: parseDateTime(data.date, data.breakEnd),
        overtimeHours: parseFloat(data.overtimeHours) || 0,
        notes: data.notes || '',
        status: data.status || 'PRESENT',
      },
      include: {
        employee: {
          include: {
            department: true,
            position: true,
          },
        },
      },
    });

    logDatabaseChange({
      request,
      action: 'UPDATE',
      model: 'AttendanceRecord',
      recordId: record.id,
      details: {
        employeeId: record.employeeId,
        date: record.date,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        status: record.status,
      },
    });

    return successResponse(record);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE attendance record (revert to "not punched")
export async function DELETE(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const isEmployeeMode = user.role === 'EMPLOYEE' || viewMode === 'employee';
    if (isEmployeeMode) {
      return errorResponse('Forbidden', 403);
    }

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return errorResponse('Record ID is required', 400);
    }

    const currentRecord = await prisma.attendanceRecord.findUnique({ where: { id } });
    if (!currentRecord) {
      return errorResponse('Attendance record not found', 404);
    }

    const payrollMonth = getPayrollMonthForAttendanceDate(currentRecord.date);
    const payrollRecord = await prisma.payrollRecord.findFirst({
      where: {
        employeeId: currentRecord.employeeId,
        month: payrollMonth,
        status: { in: ['APPROVED', 'PAID'] },
      },
    });
    if (payrollRecord) {
      return errorResponse(
        `給与 ${payrollMonth} が確定済みのため、勤怠データを削除できません。未確定に戻してから操作してください。 (Bảng lương ${payrollMonth} đã chốt — hủy chốt trước khi xóa chấm công.)`,
        400
      );
    }

    await prisma.attendanceRecord.delete({ where: { id } });

    logDatabaseChange({
      request,
      action: 'DELETE',
      model: 'AttendanceRecord',
      recordId: id,
      details: {
        employeeId: currentRecord.employeeId,
        date: currentRecord.date,
      },
    });

    return successResponse({ message: '勤怠記録を削除しました' });
  } catch (error) {
    return handleApiError(error);
  }
}


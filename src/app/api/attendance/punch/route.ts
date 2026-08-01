import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, handleApiError, successResponse } from '@/lib/api-utils';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';
import { isRateLimited } from '@/lib/rate-limiter';
import { computeServerOvertimeHours } from '@/lib/attendance-overtime';
import { getPayrollMonthForAttendanceDate } from '@/lib/payroll-helpers';


export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    const employeeId = user.id;

    const now = new Date();
    const jstStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(now);
    const todayStart = new Date(`${jstStr}T00:00:00+09:00`);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const record = await prisma.attendanceRecord.findFirst({
      where: {
        employeeId,
        date: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });

    return successResponse({ success: true, data: record });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (isRateLimited(request, 10, 60 * 1000)) {
      return errorResponse('リクエストが多すぎます。しばらく時間をおいてから再度お試しください。', 429);
    }
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    const employeeId = user.id;

    // Check if payroll is locked for the current month
    const nowCheck = new Date();
    const jstStrCheck = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(nowCheck);
    const todayStartCheck = new Date(`${jstStrCheck}T00:00:00+09:00`);
    const payrollMonthCheck = getPayrollMonthForAttendanceDate(todayStartCheck);

    const payrollRecord = await prisma.payrollRecord.findFirst({
      where: {
        employeeId,
        month: payrollMonthCheck,
        status: {
          in: ['APPROVED', 'PAID']
        }
      }
    });
    if (payrollRecord) {
      return errorResponse('この月の給与計算がすでに確定されているため、打刻できません。 (Bảng lương tháng này đã được chốt, không thể thực hiện chấm công.)', 400);
    }

    // Check if employee has resigned
    const empRecord = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { status: true, contractEndDate: true, firstName: true, lastName: true },
    });
    if (empRecord && empRecord.status === 'INACTIVE') {
      const name = `${empRecord.lastName} ${empRecord.firstName}`;
      if (empRecord.contractEndDate) {
        const endStr = new Date(empRecord.contractEndDate).toISOString().split('T')[0];
        return errorResponse(
          `${name} は ${endStr} に退職済みのため、打刻できません。 (${name} đã nghỉ việc ngày ${endStr}, không thể chấm công.)`,
          400
        );
      }
      return errorResponse(
        `${name} は退職済みのため、打刻できません。 (${name} đã nghỉ việc, không thể chấm công.)`,
        400
      );
    }

    const body = await request.json();
    const { action } = body; // 'checkIn' | 'breakStart' | 'breakEnd' | 'checkOut'

    if (!['checkIn', 'breakStart', 'breakEnd', 'checkOut'].includes(action)) {
      return errorResponse('Invalid action', 400);
    }

    const now = new Date();
    const jstStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(now);
    const todayStart = new Date(`${jstStr}T00:00:00+09:00`);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Look for existing record today
    let record = await prisma.attendanceRecord.findFirst({
      where: {
        employeeId,
        date: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });

    if (record) {
      if (action === 'checkOut') {
        record = await prisma.$transaction(async (tx) => {
          const latestRecord = await tx.attendanceRecord.findUniqueOrThrow({
            where: { id: record!.id }
          });

          const checkInTime = latestRecord.checkIn || now;
          const overtimeHours = await computeServerOvertimeHours(tx, employeeId, {
            status: latestRecord.status,
            checkIn: checkInTime,
            checkOut: now,
            breakStart: latestRecord.breakStart,
            breakEnd: latestRecord.breakEnd,
            date: latestRecord.date,
          });

          return tx.attendanceRecord.update({
            where: { id: latestRecord.id },
            data: { checkOut: now, overtimeHours },
          });
        });

        logDatabaseChange({
          request,
          action: 'UPDATE',
          model: 'AttendanceRecord',
          recordId: record.id,
          details: {
            employeeId: record.employeeId,
            date: record.date,
            action,
            updateData: { checkOut: now, overtimeHours: record.overtimeHours },
          },
        });
      } else {
        // Update existing record
        const updateData: any = {};
        if (action === 'checkIn') {
          updateData.checkIn = now;
          updateData.status = 'PRESENT';
        } else if (action === 'breakStart') {
          updateData.breakStart = now;
        } else if (action === 'breakEnd') {
          updateData.breakEnd = now;
        }

        record = await prisma.attendanceRecord.update({
          where: { id: record.id },
          data: updateData,
        });

        if (record.checkIn && record.checkOut) {
          const overtimeHours = await computeServerOvertimeHours(prisma, employeeId, {
            status: record.status,
            checkIn: record.checkIn,
            checkOut: record.checkOut,
            breakStart: record.breakStart,
            breakEnd: record.breakEnd,
            date: record.date,
          });
          record = await prisma.attendanceRecord.update({
            where: { id: record.id },
            data: { overtimeHours },
          });
        }

        logDatabaseChange({
          request,
          action: 'UPDATE',
          model: 'AttendanceRecord',
          recordId: record.id,
          details: {
            employeeId: record.employeeId,
            date: record.date,
            action,
            updateData,
          },
        });
      }
    } else {
      // Create new record for today
      const createData: any = {
        employeeId,
        date: todayStart,
        status: 'PRESENT',
      };

      if (action === 'checkIn') {
        createData.checkIn = now;
      } else if (action === 'breakStart') {
        createData.breakStart = now;
      } else if (action === 'breakEnd') {
        createData.breakEnd = now;
      } else if (action === 'checkOut') {
        createData.checkOut = now;
      }

      record = await prisma.attendanceRecord.create({
        data: createData,
      });

      logDatabaseChange({
        request,
        action: 'CREATE',
        model: 'AttendanceRecord',
        recordId: record.id,
        details: {
          employeeId: record.employeeId,
          date: record.date,
          action,
          createData,
        },
      });
    }

    return successResponse({ success: true, data: record });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Reset today's punch — delete record so user can punch again. */
export async function DELETE(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    const employeeId = user.id;

    const now = new Date();
    const jstStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(now);
    const todayStart = new Date(`${jstStr}T00:00:00+09:00`);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const payrollMonth = getPayrollMonthForAttendanceDate(todayStart);
    const payrollRecord = await prisma.payrollRecord.findFirst({
      where: {
        employeeId,
        month: payrollMonth,
        status: { in: ['APPROVED', 'PAID'] },
      },
    });
    if (payrollRecord) {
      return errorResponse(
        'この月の給与計算がすでに確定されているため、打刻を取り消せません。 (Bảng lương tháng này đã chốt, không thể hủy chấm công.)',
        400
      );
    }

    const record = await prisma.attendanceRecord.findFirst({
      where: {
        employeeId,
        date: { gte: todayStart, lt: todayEnd },
      },
    });

    if (!record) {
      return successResponse({ success: true, data: null });
    }

    await prisma.attendanceRecord.delete({ where: { id: record.id } });

    logDatabaseChange({
      request,
      action: 'DELETE',
      model: 'AttendanceRecord',
      recordId: record.id,
      details: {
        employeeId: record.employeeId,
        date: record.date,
        reason: 'punch_reset',
      },
    });

    return successResponse({ success: true, data: null });
  } catch (error) {
    return handleApiError(error);
  }
}

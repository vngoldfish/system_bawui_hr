import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, handleApiError, successResponse } from '@/lib/api-utils';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';
import { isRateLimited } from '@/lib/rate-limiter';
import { calculateContractAwareOvertime } from '@/lib/attendance-helpers';


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
    const monthStrCheck = `${todayStartCheck.getFullYear()}-${String(todayStartCheck.getMonth() + 1).padStart(2, '0')}`;

    const payrollRecord = await prisma.payrollRecord.findFirst({
      where: {
        employeeId,
        month: monthStrCheck,
        status: {
          in: ['APPROVED', 'PAID']
        }
      }
    });
    if (payrollRecord) {
      return errorResponse('この月の給与計算がすでに確定されているため、打刻できません。 (Bảng lương tháng này đã được chốt, không thể thực hiện chấm công.)', 400);
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

          // Retrieve rounding policy
          const company = await tx.company.findFirst();
          const policy = company?.roundingPolicy || 'exact';

          // Fetch employee along with contracts
          const employee = await tx.employee.findUnique({
            where: { id: employeeId },
            include: {
              employeeContracts: {
                where: { isActive: true }
              }
            }
          });

          // Fetch active holiday for today if any
          const todayHoliday = await tx.holiday.findFirst({
            where: {
              date: {
                gte: todayStart,
                lt: todayEnd,
              },
              isActive: true
            }
          });

          // Find contract active for today
          const activeContract = employee?.employeeContracts?.find(contract => {
            const start = new Date(contract.startDate);
            const end = contract.endDate ? new Date(contract.endDate) : null;
            const target = latestRecord.date;
            return start <= target && (!end || end >= target);
          }) || employee?.employeeContracts?.find(c => c.isActive) || null;

          const updateData: any = {};
          updateData.checkOut = now;

          // Calculate work hours & overtime hours if both checkIn and checkOut exist
          const checkInTime = latestRecord.checkIn || now;
          const breakStart = latestRecord.breakStart;
          const breakEnd = latestRecord.breakEnd;

          const overtimeHours = calculateContractAwareOvertime(
            {
              checkIn: checkInTime,
              checkOut: now,
              breakStart,
              breakEnd,
              date: latestRecord.date,
            },
            activeContract,
            todayHoliday,
            policy
          );
          updateData.overtimeHours = overtimeHours;

          return tx.attendanceRecord.update({
            where: { id: latestRecord.id },
            data: updateData,
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

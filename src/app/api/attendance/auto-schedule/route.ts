import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildAutoScheduleForMonth } from '@/lib/attendance-estimate';
import { createdResponse, errorResponse, handleApiError, successResponse } from '@/lib/api-utils';
// successResponse used by GET preview
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';
import { getPayrollMonthForAttendanceDate } from '@/lib/payroll-helpers';
import { isAttendanceAutoScheduleEnabled } from '@/lib/system-settings';

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    if (viewMode === 'employee' || (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER')) {
      return errorResponse('Forbidden', 403);
    }

    if (!(await isAttendanceAutoScheduleEnabled())) {
      return errorResponse(
        '自動配置機能はシステム設定で無効になっています。 (Tính năng tự động xếp ca đã tắt trong Cài đặt hệ thống.)',
        403
      );
    }

    const body = await request.json();
    const { employeeId, year, month, replaceExisting = true } = body;

    if (!employeeId || !year || !month) {
      return errorResponse('employeeId, year, month are required', 400);
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employeeContracts: { where: { isActive: true } },
      },
    });
    if (!employee) return errorResponse('従業員が見つかりません', 404);

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const payrollMonth = getPayrollMonthForAttendanceDate(monthStart);

    const payrollRecord = await prisma.payrollRecord.findFirst({
      where: {
        employeeId,
        month: payrollMonth,
        status: { in: ['APPROVED', 'PAID'] },
      },
    });
    if (payrollRecord) {
      return errorResponse(
        `給与 ${payrollMonth} が確定済みのため、自動配置できません。 (Bảng lương ${payrollMonth} đã chốt.)`,
        400
      );
    }

    const holidays = await prisma.holiday.findMany({
      where: {
        isActive: true,
        date: { gte: monthStart, lte: monthEnd },
      },
    });
    const holidayDates = new Set(
      holidays.filter(h => h.isPaidHoliday).map(h => {
        const d = new Date(h.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })
    );

    const schedule = buildAutoScheduleForMonth({
      employee: {
        salaryType: employee.salaryType,
        hourlyRate: employee.hourlyRate,
        dailyRate: employee.dailyRate,
        workLimitVisa28h: employee.workLimitVisa28h,
        workLimitIncomeCap80k: employee.workLimitIncomeCap80k,
        workLimitWeeklyHours: employee.workLimitWeeklyHours,
        workLimitMonthlyIncome: employee.workLimitMonthlyIncome,
        employeeContracts: employee.employeeContracts.map(c => ({
          isActive: c.isActive,
          startDate: c.startDate.toISOString(),
          endDate: c.endDate?.toISOString() ?? null,
          workDays: (c.workDays as number[]) || [1, 2, 3, 4, 5],
          standardHoursPerDay: c.standardHoursPerDay ?? 4,
          defaultCheckIn: c.defaultCheckIn || '09:00',
          defaultCheckOut: c.defaultCheckOut || '17:00',
          defaultBreakStart: c.defaultBreakStart || '12:00',
          defaultBreakEnd: c.defaultBreakEnd || '13:00',
        })),
      },
      year: Number(year),
      month: Number(month),
      holidayDates,
    });

    if (!schedule) {
      return errorResponse(
        'この従業員には就労時間・収入上限が設定されていません。 (Nhân viên chưa bật giới hạn 28h/tuần hoặc trần thu nhập.)',
        400
      );
    }

    if (schedule.days.length === 0) {
      return errorResponse('配置可能な勤務日がありません。', 400);
    }

    const created = await prisma.$transaction(async tx => {
      if (replaceExisting) {
        await tx.attendanceRecord.deleteMany({
          where: {
            employeeId,
            date: { gte: monthStart, lte: monthEnd },
          },
        });
      }

      const results = [];
      for (const day of schedule.days) {
        const existing = await tx.attendanceRecord.findFirst({
          where: { employeeId, date: new Date(`${day.date}T00:00:00+09:00`) },
        });
        if (existing && !replaceExisting) continue;

        const record = await tx.attendanceRecord.create({
          data: {
            employeeId,
            date: new Date(`${day.date}T00:00:00+09:00`),
            checkIn: new Date(day.checkIn + '+09:00'),
            checkOut: new Date(day.checkOut + '+09:00'),
            breakStart: day.breakStart ? new Date(day.breakStart + '+09:00') : null,
            breakEnd: day.breakEnd ? new Date(day.breakEnd + '+09:00') : null,
            overtimeHours: 0,
            status: 'PRESENT',
            notes: '自動配置 (auto-schedule)',
          },
        });
        results.push(record);
      }
      return results;
    });

    logDatabaseChange({
      request,
      action: 'CREATE',
      model: 'AttendanceRecord',
      recordId: employeeId,
      details: {
        action: 'auto-schedule',
        year,
        month,
        daysCreated: created.length,
        summary: schedule.summary,
      },
    });

    return createdResponse({
      created: created.length,
      summary: schedule.summary,
      records: created,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) return errorResponse('Unauthorized', 401);

    if (!(await isAttendanceAutoScheduleEnabled())) {
      return errorResponse('自動配置機能は無効です', 403);
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const year = parseInt(searchParams.get('year') || '0', 10);
    const month = parseInt(searchParams.get('month') || '0', 10);

    if (!employeeId || !year || !month) {
      return errorResponse('employeeId, year, month are required', 400);
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { employeeContracts: { where: { isActive: true } } },
    });
    if (!employee) return errorResponse('従業員が見つかりません', 404);

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const holidays = await prisma.holiday.findMany({
      where: { isActive: true, date: { gte: monthStart, lte: monthEnd } },
    });
    const holidayDates = new Set(
      holidays.filter(h => h.isPaidHoliday).map(h => {
        const d = new Date(h.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })
    );

    const schedule = buildAutoScheduleForMonth({
      employee: {
        salaryType: employee.salaryType,
        hourlyRate: employee.hourlyRate,
        dailyRate: employee.dailyRate,
        workLimitVisa28h: employee.workLimitVisa28h,
        workLimitIncomeCap80k: employee.workLimitIncomeCap80k,
        workLimitWeeklyHours: employee.workLimitWeeklyHours,
        workLimitMonthlyIncome: employee.workLimitMonthlyIncome,
        employeeContracts: employee.employeeContracts.map(c => ({
          isActive: c.isActive,
          startDate: c.startDate.toISOString(),
          endDate: c.endDate?.toISOString() ?? null,
          workDays: (c.workDays as number[]) || [1, 2, 3, 4, 5],
          standardHoursPerDay: c.standardHoursPerDay ?? 4,
          defaultCheckIn: c.defaultCheckIn || '09:00',
          defaultCheckOut: c.defaultCheckOut || '17:00',
          defaultBreakStart: c.defaultBreakStart || '12:00',
          defaultBreakEnd: c.defaultBreakEnd || '13:00',
        })),
      },
      year,
      month,
      holidayDates,
    });

    if (!schedule) {
      return errorResponse('就労制限が未設定です', 400);
    }

    return successResponse(schedule);
  } catch (error) {
    return handleApiError(error);
  }
}
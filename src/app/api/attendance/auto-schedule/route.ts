import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  buildAutoScheduleForMonth,
  parseShiftPattern,
  type ExistingAttendanceDay,
  type ShiftPattern,
} from '@/lib/attendance-estimate';
import { createdResponse, errorResponse, handleApiError, successResponse } from '@/lib/api-utils';
// successResponse used by GET preview
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';
import { computeServerOvertimeHours } from '@/lib/attendance-overtime';
import { getAttendanceMonthDateRangeJst, getPayrollMonthForAttendanceDate } from '@/lib/payroll-helpers';
import { dateOnlyJst } from '@/lib/utils';
import { isAttendanceAutoScheduleEnabled } from '@/lib/system-settings';

const SHIFT_PATTERN_REQUIRED_MSG =
  '勤怠画面の「今月のデフォルト勤務パターン」を設定してください。 (Hãy cấu hình mẫu ca tháng trên màn chấm công.)';

function shiftPatternFromQuery(searchParams: URLSearchParams): ShiftPattern | undefined {
  return parseShiftPattern({
    checkIn: searchParams.get('shiftCheckIn'),
    checkOut: searchParams.get('shiftCheckOut'),
    breakStart: searchParams.get('shiftBreakStart'),
    breakEnd: searchParams.get('shiftBreakEnd'),
    hasBreak: searchParams.get('shiftHasBreak'),
  });
}

function formatRecordDate(date: Date): string {
  return dateOnlyJst(date);
}

function mapExistingAttendance(
  records: Array<{
    date: Date;
    checkIn: Date | null;
    checkOut: Date | null;
    breakStart: Date | null;
    breakEnd: Date | null;
    status: string;
  }>
): { existingAttendance: ExistingAttendanceDay[]; occupiedDates: Set<string> } {
  const existingAttendance: ExistingAttendanceDay[] = [];
  const occupiedDates = new Set<string>();
  for (const r of records) {
    if (r.status !== 'PRESENT' && r.status !== 'LATE' && r.status !== 'EARLY_LEAVE') continue;
    const dateStr = formatRecordDate(new Date(r.date));
    occupiedDates.add(dateStr);
    existingAttendance.push({
      date: dateStr,
      checkIn: r.checkIn?.toISOString() ?? null,
      checkOut: r.checkOut?.toISOString() ?? null,
      breakStart: r.breakStart?.toISOString() ?? null,
      breakEnd: r.breakEnd?.toISOString() ?? null,
      status: r.status,
    });
  }
  return { existingAttendance, occupiedDates };
}

function shiftPatternFromBody(body: Record<string, unknown>): ShiftPattern | undefined {
  if (body.shiftPattern && typeof body.shiftPattern === 'object') {
    const p = body.shiftPattern as Record<string, unknown>;
    return parseShiftPattern({
      checkIn: typeof p.checkIn === 'string' ? p.checkIn : null,
      checkOut: typeof p.checkOut === 'string' ? p.checkOut : null,
      breakStart: typeof p.breakStart === 'string' ? p.breakStart : null,
      breakEnd: typeof p.breakEnd === 'string' ? p.breakEnd : null,
      hasBreak: typeof p.hasBreak === 'boolean' ? p.hasBreak : null,
    });
  }
  return parseShiftPattern({
    checkIn: typeof body.shiftCheckIn === 'string' ? body.shiftCheckIn : null,
    checkOut: typeof body.shiftCheckOut === 'string' ? body.shiftCheckOut : null,
    breakStart: typeof body.shiftBreakStart === 'string' ? body.shiftBreakStart : null,
    breakEnd: typeof body.shiftBreakEnd === 'string' ? body.shiftBreakEnd : null,
    hasBreak: typeof body.shiftHasBreak === 'boolean' ? body.shiftHasBreak : null,
  });
}

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
    const { employeeId, year, month, replaceExisting = false, targetSalary, targetDays } = body;
    const shiftPattern = shiftPatternFromBody(body as Record<string, unknown>);

    if (!employeeId || !year || !month) {
      return errorResponse('employeeId, year, month are required', 400);
    }

    if (!shiftPattern) {
      return errorResponse(SHIFT_PATTERN_REQUIRED_MSG, 400);
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employeeContracts: { where: { isActive: true } },
      },
    });
    if (!employee) return errorResponse('従業員が見つかりません', 404);

    // Check if employee has resigned
    if (employee.status === 'INACTIVE') {
      if (employee.contractEndDate) {
        const endDate = new Date(employee.contractEndDate);
        const name = `${employee.lastName} ${employee.firstName}`;
        const endStr = endDate.toISOString().split('T')[0];
        // Check if the entire target month is after resignation
        const calendarMonthCheck = `${year}-${String(month).padStart(2, '0')}`;
        const { startUtc: monthStartCheck } = getAttendanceMonthDateRangeJst(calendarMonthCheck);
        if (monthStartCheck > endDate) {
          return errorResponse(
            `${name} は ${endStr} に退職済みのため、自動配置できません。 (${name} đã nghỉ việc ngày ${endStr}, không thể tự động xếp ca.)`,
            400
          );
        }
      } else {
        const name = `${employee.lastName} ${employee.firstName}`;
        return errorResponse(
          `${name} は退職済みのため、自動配置できません。 (${name} đã nghỉ việc, không thể tự động xếp ca.)`,
          400
        );
      }
    }

    const calendarMonth = `${year}-${String(month).padStart(2, '0')}`;
    const { startUtc: monthStart, endUtc: monthEnd } = getAttendanceMonthDateRangeJst(calendarMonth);
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
      holidays.filter(h => h.isPaidHoliday).map(h => dateOnlyJst(h.date))
    );

    const monthRecords = await prisma.attendanceRecord.findMany({
      where: {
        employeeId,
        date: { gte: monthStart, lte: monthEnd },
        status: { in: ['PRESENT', 'LATE', 'EARLY_LEAVE'] },
      },
    });
    const { existingAttendance, occupiedDates } = mapExistingAttendance(monthRecords);

    const schedule = buildAutoScheduleForMonth({
      employee: {
        salaryType: employee.salaryType,
        salary: employee.salary,
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
      shiftPattern,
      occupiedDates: replaceExisting ? new Set<string>() : occupiedDates,
      existingAttendance: replaceExisting ? [] : existingAttendance,
      targetSalary: targetSalary ? Number(targetSalary) : null,
      targetDays: targetDays ? Number(targetDays) : null,
    });

    if (!schedule) {
      return errorResponse(
        '就労制限、目標給与、または目標勤務日数が指定されていません。 (Nhân viên chưa cấu hình giới hạn giờ làm, mục tiêu lương, hoặc số ngày làm.)',
        400
      );
    }

    if (schedule.days.length === 0) {
      const baseMsg = occupiedDates.size > 0 && !replaceExisting
        ? '上限に達しているか、空き勤務日がありません。 (Đã đủ giới hạn hoặc không còn ngày trống để xếp.)'
        : '配置可能な勤務日がありません。今月のデフォルト勤務パターン（出勤・退勤・休憩）を確認してください。 (Không xếp được ca — kiểm tra mẫu ca tháng trên màn chấm công.)';
      return errorResponse(schedule.warning ? `${schedule.warning} ${baseMsg}` : baseMsg, 400);
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
        const recordDate = new Date(`${day.date}T00:00:00+09:00`);

        if (
          employee.status === 'INACTIVE' &&
          employee.contractEndDate &&
          recordDate > new Date(employee.contractEndDate)
        ) {
          continue;
        }

        const existing = await tx.attendanceRecord.findFirst({
          where: { employeeId, date: recordDate },
        });
        if (existing && !replaceExisting) continue;
        const checkIn = new Date(day.checkIn + '+09:00');
        const checkOut = new Date(day.checkOut + '+09:00');
        const breakStart = day.breakStart ? new Date(day.breakStart + '+09:00') : null;
        const breakEnd = day.breakEnd ? new Date(day.breakEnd + '+09:00') : null;
        const overtimeHours = await computeServerOvertimeHours(tx, employeeId, {
          status: 'PRESENT',
          checkIn,
          checkOut,
          breakStart,
          breakEnd,
          date: recordDate,
        });

        const record = await tx.attendanceRecord.create({
          data: {
            employeeId,
            date: recordDate,
            checkIn,
            checkOut,
            breakStart,
            breakEnd,
            overtimeHours,
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
    const targetSalary = searchParams.get('targetSalary') ? parseFloat(searchParams.get('targetSalary')!) : null;
    const targetDays = searchParams.get('targetDays') ? parseInt(searchParams.get('targetDays')!, 10) : null;

    if (!employeeId || !year || !month) {
      return errorResponse('employeeId, year, month are required', 400);
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { employeeContracts: { where: { isActive: true } } },
    });
    if (!employee) return errorResponse('従業員が見つかりません', 404);

    const calendarMonth = `${year}-${String(month).padStart(2, '0')}`;
    const { startUtc: monthStart, endUtc: monthEnd } = getAttendanceMonthDateRangeJst(calendarMonth);
    const holidays = await prisma.holiday.findMany({
      where: { isActive: true, date: { gte: monthStart, lte: monthEnd } },
    });
    const holidayDates = new Set(
      holidays.filter(h => h.isPaidHoliday).map(h => dateOnlyJst(h.date))
    );

    const replaceExisting = searchParams.get('replaceExisting') === 'true';
    const monthRecords = await prisma.attendanceRecord.findMany({
      where: {
        employeeId,
        date: { gte: monthStart, lte: monthEnd },
        status: { in: ['PRESENT', 'LATE', 'EARLY_LEAVE'] },
      },
    });
    const { existingAttendance, occupiedDates } = mapExistingAttendance(monthRecords);

    const shiftPattern = shiftPatternFromQuery(searchParams);
    if (!shiftPattern) {
      return errorResponse(SHIFT_PATTERN_REQUIRED_MSG, 400);
    }
    const schedule = buildAutoScheduleForMonth({
      employee: {
        salaryType: employee.salaryType,
        salary: employee.salary,
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
      shiftPattern,
      occupiedDates: replaceExisting ? new Set<string>() : occupiedDates,
      existingAttendance: replaceExisting ? [] : existingAttendance,
      targetSalary,
      targetDays,
    });

    if (!schedule) {
      return errorResponse('就労制限、目標給与、または目標勤務日数が指定されていません。', 400);
    }

    return successResponse(schedule);
  } catch (error) {
    return handleApiError(error);
  }
}